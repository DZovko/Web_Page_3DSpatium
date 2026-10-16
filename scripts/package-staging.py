"""Build a deterministic staging-only ZIP; never connects to a remote host.
Run from the website root: py -3.10 scripts/package-staging.py
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import io
import json
import re
import subprocess
import zipfile
import argparse

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts'
parser = argparse.ArgumentParser(description='Build staging or production public website package; never deploys.')
parser.add_argument('--target', choices=['staging', 'production'], default='staging')
MODE = parser.parse_args().target
TARGET = '/home/dspatiumhr/public_html/' if MODE == 'production' else '/home/dspatiumhr/staging.3dspatium.hr/'
FILES = ['index.html', 'privatnost.html', 'uvjeti.html', 'styles.css', 'myscript.js',
         'gallery-config.js', 'gallery-sanity.js', '.htaccess', 'robots.txt', 'sitemap.xml']
if MODE == 'production':
    FILES.remove('.htaccess')  # Preserve every live server-managed configuration file.
IMAGES = ['slike/favicon.svg', 'slike/glavna.jpg', 'slike/logo-pozadina-alt.svg',
          'slike/svg-logo/instagram.svg']
SOURCE = json.loads((ROOT / 'migration/gallery-manifest.json').read_text(encoding='utf-8'))
assert SOURCE['projectId'] == 'abufysa8' and SOURCE['dataset'] == 'production'
assert len(SOURCE['projects']) == 4
assert [len(project['photographs']) for project in SOURCE['projects']] == [4, 8, 9, 4]
for project in SOURCE['projects']:
    for photo in project['photographs']:
        name = photo['sourcePath']
        assert re.fullmatch(r'slike/projekt[1-4]/[1-9]\.webp', name), name
        assert name != 'slike/projekt1/5.webp'
        assert hashlib.sha1((ROOT / name).read_bytes()).hexdigest() == photo['sha1'], name
        IMAGES.append(name)
assert len(IMAGES) == len(set(IMAGES)) == 29
names = sorted(FILES + IMAGES)
assert len(names) == (38 if MODE == 'production' else 39)
data = {}
for name in names:
    file = ROOT / name
    assert not file.is_symlink() and file.resolve().is_relative_to(ROOT), name
    data[name] = file.read_bytes()
assert re.search(rb'enabled:\s*true', data['gallery-config.js']), 'Integration must be enabled for staging'
assert b'credentials: "omit"' in data['gallery-sanity.js']
assert b'"published"' in data['gallery-sanity.js']

# Do not ship a modified production deployment configuration, even indirectly.
original_deploy = subprocess.check_output(['git', 'show', 'HEAD:.cpanel.yml'], cwd=ROOT)
assert original_deploy.replace(b'\r\n', b'\n') == (ROOT / '.cpanel.yml').read_bytes().replace(b'\r\n', b'\n'), '.cpanel.yml changed'
assert '.cpanel.yml' not in names

versions = {name: hashlib.sha256(data[name]).hexdigest()[:12]
            for name in ['styles.css', 'myscript.js', 'gallery-config.js', 'gallery-sanity.js']}
for name in ['index.html', 'privatnost.html', 'uvjeti.html']:
    html = data[name].decode('utf-8')
    for asset, version in versions.items():
        html = re.sub(r'(["\x27])' + re.escape(asset) + r'(?:\?[^"\x27]*)?(["\x27])',
                      lambda match: match[1] + asset + '?v=' + version + match[2], html)
    if MODE == 'staging':
        html = html.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>')
    else:
        # Legal pages intentionally have noindex, follow in the original site.
        if name == 'index.html':
            assert not re.search(r'<meta\b[^>]*(?:noindex|nofollow)', html, re.I), 'Staging indexing directive in production homepage'
        else:
            assert 'noindex, nofollow' not in html.lower(), 'Staging-specific directive in legal page'
    data[name] = html.encode('utf-8')
# Staging is noindex via HTML and the existing host-scoped Apache header.
# Let crawlers read those directives; do not advertise production's sitemap here.
if MODE == 'staging':
    data['robots.txt'] = b'User-agent: *\nAllow: /\n'
else:
    assert b'Disallow: /' not in data['robots.txt']
    assert b'https://3dspatium.hr/sitemap.xml' in data['robots.txt']
    assert b'https://3dspatium.hr/' in data['sitemap.xml']

class Resources(HTMLParser):
    def handle_starttag(self, tag, attributes):
        for key, value in attributes:
            if key not in ('src', 'href', 'xlink:href', 'data-extra') or not value:
                continue
            for item in value.split(',') if key == 'data-extra' else [value]:
                url = urlsplit(item.strip())
                if url.scheme or url.netloc or not url.path:
                    continue
                relative = unquote(url.path).lstrip('/') or 'index.html'
                assert relative in data, f'Missing packaged resource: {relative}'

for name in ['index.html', 'privatnost.html', 'uvjeti.html']:
    Resources().feed(data[name].decode('utf-8'))
for url in re.findall(r'url\(["\x27]?([^\)"\x27]+)', data['styles.css'].decode('utf-8')):
    if not urlsplit(url).scheme and not url.startswith('#'):
        assert urlsplit(url).path.lstrip('/') in data, f'Missing CSS resource: {url}'

# Reject likely credential literals in textual public files without logging values.
secret = re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?<![\w-])sk[A-Za-z0-9]{30,}(?![\w-])|(?:SANITY_AUTH_TOKEN|SANITY_API_TOKEN)\s*[:=]\s*["\x27][A-Za-z0-9_-]{25,}')
for name in names:
    assert not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts
    if Path(name).suffix in ('.html', '.js', '.css', '.svg', '.txt', '.xml'):
        assert not secret.search(data[name].decode('utf-8')), f'Possible credential in {name}'

buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in names:
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data[name], compresslevel=9)
payload = buffer.getvalue()
with zipfile.ZipFile(io.BytesIO(payload)) as archive:
    assert archive.namelist() == names and archive.testzip() is None
    for name in names:
        assert archive.read(name) == data[name]
OUTPUT.mkdir(exist_ok=True)
archive_path = OUTPUT / f'3dspatium-{MODE}.zip'
archive_path.write_bytes(payload)
report = {'targetOnly': TARGET, 'archive': archive_path.name,
          'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload),
          'files': [{'path': name, 'bytes': len(data[name]),
                     'sha256': hashlib.sha256(data[name]).hexdigest()} for name in names],
          'transforms': (['HTML noindex metadata', 'content-based CSS/JS cache versions',
                         'robots.txt without production sitemap advertisement'] if MODE == 'staging'
                         else ['content-based CSS/JS cache versions', 'server-managed files excluded']),
          'productionDeploymentFileUnchanged': True}
(OUTPUT / f'3dspatium-{MODE}.manifest.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'files'}, indent=2))
print(f'Verified: {len(names)} allowed public files, all 25 fallback images, local references, ZIP integrity; no upload performed.')
