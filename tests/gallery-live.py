"""Read-only browser smoke test against the real published Sanity API.
Requires Python Playwright and Chromium; uses http://localhost:8765.
Never sends a token or changes Sanity content. Nonzero exit means not ready.
"""
from pathlib import Path
import functools
import http.server
import json
import os
import sys
import tempfile
import threading
import io
import argparse

from PIL import Image, ImageChops

sys.path.insert(0, str(Path(tempfile.gettempdir()) / 'spatium-browser-tools'))
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--web-root', type=Path, default=ROOT, help='Optional extracted staging-package directory')
WEB_ROOT = parser.parse_args().web_root.resolve()
assert (WEB_ROOT / 'index.html').is_file(), 'Missing preview index.html'

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Handler, directory=str(WEB_ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
reports = []
OUT = Path(tempfile.gettempdir()) / 'spatium-live-checks'
OUT.mkdir(exist_ok=True)
manifest = json.loads((ROOT / 'migration/gallery-manifest.json').read_text(encoding='utf-8'))

def settle(page):
    page.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'))")
    page.evaluate("async()=>{await Promise.all([...document.images].map(e=>{e.loading='eager';return e.decode().catch(()=>{})}))}")
    page.wait_for_timeout(400)

def capture(page, label):
    settle(page)
    page.screenshot(path=str(OUT / f'{label}.png'), full_page=True, animations='disabled')
    page.locator('#portfolio').screenshot(path=str(OUT / f'{label}-gallery.png'), animations='disabled')
    page.evaluate('window.scrollTo(0,0)')
    return (
        page.screenshot(full_page=True, animations='disabled', mask=[page.locator('img')]),
        page.locator('img').evaluate_all('(images)=>images.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})'),
    )
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH',
            r'C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'), headless=True)
        for width in (375, 1440):
            context = browser.new_context(viewport={'width': width, 'height': 900}, has_touch=width==375,
                                          is_mobile=width==375, reduced_motion='reduce')
            context.route('https://fonts.googleapis.com/**', lambda route: route.abort())
            context.route('https://fonts.gstatic.com/**', lambda route: route.abort())
            page = context.new_page()
            requests, responses, errors, failures, console_errors = [], [], [], [], []
            def request_received(request):
                if 'abufysa8.api.sanity.io/' in request.url:
                    headers = request.all_headers()
                    requests.append({'method': request.method,
                        'hasAuthorization': 'authorization' in headers,
                        'hasCookie': 'cookie' in headers,
                        'publishedPerspective': 'perspective=published' in request.url})
            def response_received(response):
                if 'abufysa8.api.sanity.io/' in response.url:
                    entry = {'status': response.status,
                        'allowOrigin': response.headers.get('access-control-allow-origin')}
                    try:
                        result = response.json().get('result')
                        if isinstance(result, list):
                            entry['publishedProjects'] = len(result)
                            entry['photographs'] = sum(len(project.get('photographs', [])) for project in result)
                    except Exception:
                        pass
                    responses.append(entry)
            page.on('request', request_received)
            page.on('response', response_received)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('requestfailed', lambda request: failures.append({'url': request.url, 'failure': request.failure})
                if 'api.sanity.io/' in request.url else None)
            page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
            page.goto('http://localhost:8765/', wait_until='domcontentloaded')
            page.wait_for_function("['sanity','fallback'].includes(document.querySelector('.portfolio-grid').dataset.source)", timeout=20000)
            source = page.locator('.portfolio-grid').get_attribute('data-source')
            cards = page.locator('.pf-card').count()
            # The absence of published content must clear the original cards.
            empty = source == 'sanity' and cards == 0
            interaction_checks = 0
            visual_match = False
            if source == 'sanity' and cards == 4:
                live_capture = capture(page, f'live-{width}')
                for index, expected in enumerate(manifest['projects']):
                    trigger = page.locator('.pf-img img').nth(index)
                    photos = trigger.evaluate('(e)=>e.galleryPhotographs')
                    assert len(photos) == len(expected['photographs']), 'photo count mismatch'
                    assert page.locator('.pf-body h3').nth(index).inner_text() == expected['title']
                    assert page.locator('.pf-tag').nth(index).inner_text() == expected['location']
                    assert trigger.get_attribute('role') == 'button' and trigger.get_attribute('tabindex') == '0'
                    trigger.focus()
                    page.keyboard.press('Enter' if index % 2 == 0 else 'Space')
                    page.wait_for_timeout(30)
                    assert page.locator('#galleryModal').get_attribute('aria-hidden') == 'false'
                    assert page.evaluate('document.activeElement.id') == 'closeGallery'
                    page.keyboard.press('Shift+Tab')
                    assert page.evaluate('document.activeElement.id') == 'nextGallery'
                    page.keyboard.press('Tab')
                    assert page.evaluate('document.activeElement.id') == 'closeGallery'
                    interaction_checks += 8
                    for position, photo in enumerate(photos):
                        assert photo['src'].startswith('https://cdn.sanity.io/images/abufysa8/production/')
                        assert page.locator('#modalImg').get_attribute('src') == photo['src']
                        page.wait_for_function('document.querySelector("#modalImg").complete && document.querySelector("#modalImg").naturalWidth>0')
                        assert page.locator('#modalImg').get_attribute('alt') == expected['photographs'][position]['alt']
                        assert page.locator('#modalCaption').inner_text().endswith(f'({position+1} / {len(photos)})')
                        page.keyboard.press('ArrowRight')
                        interaction_checks += 5
                    assert page.locator('#modalImg').get_attribute('src') == photos[0]['src']
                    page.keyboard.press('ArrowLeft')
                    assert page.locator('#modalImg').get_attribute('src') == photos[-1]['src']
                    page.keyboard.press('Escape')
                    assert trigger.evaluate('(e)=>document.activeElement===e')
                    page.wait_for_timeout(350)
                    assert page.evaluate('document.body.style.overflow') == ''
                    interaction_checks += 4
                if width == 375:
                    page.locator('.pf-img img').first.tap()
                    page.wait_for_timeout(30)
                    page.locator('#nextGallery').tap()
                    assert page.locator('#modalCaption').inner_text().endswith('(2 / 4)')
                    page.locator('#closeGallery').tap()
                    page.wait_for_timeout(350)
                    interaction_checks += 1
                baseline = browser.new_context(viewport={'width': width, 'height': 900}, has_touch=width==375,
                                               is_mobile=width==375, reduced_motion='reduce')
                baseline.route('https://fonts.googleapis.com/**', lambda route: route.abort())
                baseline.route('https://fonts.gstatic.com/**', lambda route: route.abort())
                baseline.route('**/gallery-config.js*', lambda route: route.fulfill(
                    body=(WEB_ROOT/'gallery-config.js').read_text().replace('enabled: true','enabled: false'),
                    content_type='text/javascript'))
                before = baseline.new_page()
                before.goto('http://localhost:8765/')
                static_capture = capture(before, f'static-{width}')
                a = Image.open(io.BytesIO(live_capture[0])).convert('RGB')
                b = Image.open(io.BytesIO(static_capture[0])).convert('RGB')
                changed = sum(1 for pixel in ImageChops.difference(a,b).getdata() if max(pixel)>2) if a.size==b.size else -1
                visual_match = a.size==b.size and 0<=changed<=10 and live_capture[1]==static_capture[1]
                assert visual_match, f'Layout/geometry mismatch at {width}; changed pixels: {changed}'
                baseline.close()
            reports.append({'width': width, 'source': source, 'cards': cards,
                'interactionChecks': interaction_checks, 'staticLayoutAndImageGeometryMatch': visual_match,
                'emptySuccessClearsGallery': empty, 'requests': requests,
                'responses': responses, 'pageErrors': errors, 'failedRequests': failures, 'consoleErrors': console_errors,
                'ready': source == 'sanity' and cards == 4 and bool(responses)
                    and responses[-1].get('photographs') == 25 and not errors and visual_match and interaction_checks>=173
                    and all(not r['hasAuthorization'] and not r['hasCookie'] and r['publishedPerspective'] for r in requests)})
            context.close()
        browser.close()
finally:
    server.shutdown()
print(json.dumps(reports, indent=2))
sys.exit(0 if reports and all(report['ready'] for report in reports) else 1)
