"""Local browser regression checks. Requires Python Playwright and a Chromium browser.
No requests reach Sanity; all external requests are intercepted.
Run from the website root: python tests/gallery-browser.py
"""
from pathlib import Path
import copy
import functools
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import io
from urllib.parse import urlparse

# Reuse existing temporary verification tooling if installed there.
sys.path.insert(0, str(Path(tempfile.gettempdir()) / 'spatium-browser-tools'))
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'migration/gallery-manifest.json').read_text(encoding='utf-8'))
OUT = Path(tempfile.gettempdir()) / 'spatium-sanity-checks'
OUT.mkdir(exist_ok=True)
checks = []
errors = []

def check(label, condition):
    assert condition, label
    checks.append(label)

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/'
baseline_html = subprocess.check_output(['git', 'show', 'HEAD:index.html'], cwd=ROOT)
baseline_js = subprocess.check_output(['git', 'show', 'HEAD:myscript.js'], cwd=ROOT)
projects = []
image_files = {}
for source in MANIFEST['projects']:
    photos = []
    for photo in source['photographs']:
        url = 'https://cdn.sanity.io/images/abufysa8/production/' + photo['sourcePath'].replace('/', '-')
        image_files[url] = ROOT / photo['sourcePath']
        photos.append({'_key': photo['_key'], 'alt': photo['alt'], 'url': url})
    projects.append({'_id': source['documentId'], 'title': source['title'], 'location': source['location'],
                     'displayOrder': source['displayOrder'], 'photographs': photos})

def context_for(browser, mode='sanity', result=None, width=1440, touch=False):
    context = browser.new_context(viewport={'width': width, 'height': 900}, device_scale_factor=1,
                                  has_touch=touch, is_mobile=touch, reduced_motion='reduce')
    def route(request):
        url = request.request.url
        parsed = urlparse(url)
        if parsed.hostname == 'abufysa8.api.sanity.io':
            check('published perspective requested', 'perspective=published' in url)
            check('no browser credentials', 'authorization' not in request.request.headers)
            if mode == 'network-error':
                request.abort()
            elif mode == 'api-error':
                request.fulfill(status=503, json={'error': 'unavailable'})
            elif mode == 'invalid-json':
                request.fulfill(status=200, body='not json')
            else:
                request.fulfill(json={'result': projects if result is None else result})
        elif url.startswith('https://cdn.sanity.io/'):
            request.fulfill(path=str(image_files[url]))
        elif parsed.hostname == '127.0.0.1':
            if mode == 'baseline' and parsed.path in ('/', '/index.html'):
                request.fulfill(body=baseline_html, content_type='text/html; charset=utf-8')
            elif mode == 'baseline' and parsed.path == '/myscript.js':
                request.fulfill(body=baseline_js, content_type='text/javascript')
            elif parsed.path == '/gallery-config.js':
                config = (ROOT / 'gallery-config.js').read_text()
                config = config.replace('enabled: true', 'enabled: false') if mode == 'disabled' else config.replace('enabled: false', 'enabled: true')
                request.fulfill(body=config.replace('8000', '250'),
                                content_type='text/javascript')
            else:
                request.continue_()
        else:
            request.abort()
    context.route('**/*', route)
    if mode == 'delayed-empty':
        context.add_init_script("""const originalFetch = window.fetch;
          window.fetch = (url, options) => String(url).includes('api.sanity.io')
            ? new Promise(resolve => { window.finishEmptyGallery = () =>
                resolve(new Response(JSON.stringify({result: []}), {status: 200})); })
            : originalFetch(url, options);""")
    if mode == 'timeout':
        # Simulate a hung fetch without leaving an intercepted Playwright route pending.
        context.add_init_script("""const originalFetch = window.fetch;
          window.fetch = (url, options) => String(url).includes('api.sanity.io')
            ? new Promise((resolve, reject) => options.signal.addEventListener('abort',
                () => reject(new DOMException('Timed out', 'AbortError'))))
            : originalFetch(url, options);""")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    if mode not in ('baseline', 'disabled', 'delayed-empty'):
        page.wait_for_function("['sanity','fallback'].includes(document.querySelector('.portfolio-grid').dataset.source)")
    return context, page

def settle(page):
    page.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))")
    page.evaluate("async()=>{await Promise.all([...document.images].map(e=>{e.loading='eager';return e.decode().catch(()=>{})}))}")
    page.wait_for_timeout(400)

def compare_pixels(left, right):
    a = Image.open(io.BytesIO(left)).convert('RGB')
    b = Image.open(io.BytesIO(right)).convert('RGB')
    if a.size != b.size:
        return False
    changed = sum(1 for pixel in ImageChops.difference(a, b).getdata() if max(pixel) > 2)
    # Chromium can vary a handful of antialiasing pixels between identical loads.
    return changed <= 10

try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH', r'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe')
        browser = p.chromium.launch(executable_path=executable, headless=True)
        for width in (375, 1440):
            screenshots = []
            image_geometry = []
            for mode in ('baseline', 'disabled', 'sanity'):
                context, page = context_for(browser, mode, width=width)
                settle(page)
                shots = page.screenshot(full_page=True, animations='disabled')
                (OUT / f'{mode}-{width}.png').write_bytes(shots)
                # Identical image decodes can rasterize differently in Chromium.
                # Compare image geometry and the full page with image pixels masked separately.
                image_geometry.append(page.locator('img').evaluate_all('(images)=>images.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})'))
                screenshots.append(page.screenshot(full_page=True, animations='disabled', mask=[page.locator('img')]))
                check(f'{mode} {width} no horizontal overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                context.close()
            check(f'{width} static text/layout matches HEAD', compare_pixels(screenshots[0], screenshots[1]))
            check(f'{width} CMS text/layout matches HEAD', compare_pixels(screenshots[0], screenshots[2]))
            check(f'{width} image geometry matches HEAD', image_geometry[0] == image_geometry[1] == image_geometry[2])

        for mode in ('disabled', 'sanity'):
            context, page = context_for(browser, mode, width=375, touch=True)
            for index, count in enumerate((4, 8, 9, 4)):
                trigger = page.locator('.pf-img img').nth(index)
                trigger.focus()
                page.keyboard.press('Enter')
                page.wait_for_timeout(30)
                check('keyboard opens modal', page.locator('#galleryModal').get_attribute('aria-hidden') == 'false')
                page.keyboard.press('Shift+Tab')
                check('reverse tab wraps', page.evaluate('document.activeElement.id') == 'nextGallery')
                page.keyboard.press('Tab')
                check('tab wraps to close', page.evaluate('document.activeElement.id') == 'closeGallery')
                for n in range(count):
                    actual = page.locator('#modalImg').get_attribute('src')
                    expected = projects[index]['photographs'][n]['url'] if mode == 'sanity' else MANIFEST['projects'][index]['photographs'][n]['sourcePath']
                    check(f'{mode} project {index+1} photo {n+1} order', actual == expected)
                    page.wait_for_function('document.querySelector("#modalImg").complete && document.querySelector("#modalImg").naturalWidth > 0')
                    check('photo counter', page.locator('#modalCaption').inner_text().endswith(f'({n+1} / {count})'))
                    page.keyboard.press('ArrowRight')
                check('wrap returns to first', page.locator('#modalCaption').inner_text().endswith(f'(1 / {count})'))
                page.keyboard.press('Escape')
                check('focus returns', trigger.evaluate('(e)=>document.activeElement===e'))
                page.wait_for_timeout(350)
            page.locator('.pf-img img').first.tap()
            page.wait_for_timeout(30)
            page.locator('#nextGallery').tap()
            check('touch next', page.locator('#modalCaption').inner_text().endswith('(2 / 4)'))
            page.locator('#closeGallery').tap()
            page.wait_for_timeout(350)
            page.locator('#menuToggle').click()
            check('mobile menu opens', page.locator('#navLinks').evaluate('(e)=>e.classList.contains("open")'))
            page.keyboard.press('Escape')
            context.close()

        for mode in ('network-error', 'api-error', 'invalid-json', 'timeout'):
            context, page = context_for(browser, mode)
            check(mode + ' keeps fallback', page.locator('.pf-card').count() == 4 and page.locator('.portfolio-grid').get_attribute('data-source') == 'fallback')
            context.close()
        context, page = context_for(browser, result=[])
        check('empty response clears static gallery', page.locator('.pf-card').count() == 0)
        check('empty response is authoritative', page.locator('.portfolio-grid').get_attribute('data-source') == 'sanity')
        context.close()
        invalid = copy.deepcopy(projects)
        invalid[1]['photographs'][0]['url'] = 'javascript:alert(1)'
        context, page = context_for(browser, result=invalid)
        check('invalid asset keeps complete fallback', page.locator('.pf-card').count() == 4 and page.locator('.portfolio-grid').get_attribute('data-source') == 'fallback')
        context.close()
        edited = copy.deepcopy(projects)
        edited[0]['title'] = '<img src=x onerror=alert(1)>'
        edited[0]['photographs'][1]['alt'] = 'Individual photograph description'
        edited[0]['photographs'][1]['caption'] = 'Individual caption'
        context, page = context_for(browser, result=edited)
        check('CMS text remains text', page.locator('.pf-body h3').first.inner_text() == edited[0]['title'] and page.locator('.pf-body h3 img').count() == 0)
        page.locator('.pf-img img').first.click()
        page.wait_for_timeout(30)
        page.keyboard.press('ArrowRight')
        check('individual alt preserved', page.locator('#modalImg').get_attribute('alt') == 'Individual photograph description')
        check('individual caption preserved', page.locator('#modalCaption').inner_text() == 'Individual caption (2 / 4)')
        context.close()
        # Mock the ordered server projection of a new publication and an unpublication.
        added = copy.deepcopy(projects[0])
        added['_id'] = 'new-project'
        for result, expected in ((projects + [added], 5), (projects[1:], 3)):
            context, page = context_for(browser, result=result)
            check('published set determines card count', page.locator('.pf-card').count() == expected)
            context.close()
        missing = copy.deepcopy(projects)
        missing[0]['photographs'][0]['url'] = None
        context, page = context_for(browser, result=missing)
        check('missing image reference keeps complete fallback', page.locator('.portfolio-grid').get_attribute('data-source') == 'fallback')
        context.close()
        context, page = context_for(browser)
        # The newest route takes priority; simulate CDN failure without modifying published data.
        context.route('https://cdn.sanity.io/**', lambda route: route.abort())
        page.reload()
        page.wait_for_function("document.querySelector('.portfolio-grid').dataset.source === 'sanity'")
        page.locator('.pf-img img').first.scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('.gallery-image-error') !== null")
        check('CDN failure shows accessible thumbnail error', page.locator('.gallery-image-error').first.get_attribute('role') == 'status')
        trigger = page.locator('.pf-img img').first
        trigger.focus()
        page.keyboard.press('Enter')
        page.wait_for_function('document.querySelector("#modalImg").hidden')
        check('CDN failure explains missing modal image', 'trenutačno nije dostupna' in page.locator('#modalCaption').inner_text())
        page.wait_for_timeout(30)
        page.keyboard.press('ArrowRight')
        check('CDN failure retains navigation', page.locator('#modalCaption').inner_text().endswith('(2 / 4)'))
        page.keyboard.press('Escape')
        check('CDN failure retains focus return', trigger.evaluate('(e)=>document.activeElement===e'))
        context.close()
        check('no uncaught page errors', not errors)
        context, page = context_for(browser, mode='delayed-empty')
        page.locator('.pf-img img').first.focus()
        page.keyboard.press('Enter')
        page.evaluate('window.finishEmptyGallery()')
        page.wait_for_function("document.querySelector('.portfolio-grid').dataset.source === 'sanity'")
        check('delayed empty response removes focused static cards', page.locator('.pf-card').count() == 0)
        check('delayed empty response closes static lightbox', page.locator('#galleryModal').get_attribute('aria-hidden') == 'true')
        check('delayed empty response restores meaningful focus', page.evaluate('document.activeElement.matches("#portfolio h2")'))
        context.close()
        browser.close()
    print(f'{len(checks)} browser assertions passed. Screenshots: {OUT}')
finally:
    server.shutdown()
