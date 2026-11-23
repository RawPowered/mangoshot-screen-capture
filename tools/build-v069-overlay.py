#!/usr/bin/env python3
"""MangoShot v0.6.9 strict in-place upgrade from v0.6.8 Visual Inspector alpha."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.8-visual-alpha.1'
NAME='MangoShot-v0.6.9-premium-brand-overlay-from-v0.6.8.zip'
FILES={
 'assets/mangoshot-wordmark.webp','assets/mangoshot-icon.webp',
 'icons/icon-16.png','icons/icon-32.png','icons/icon-48.png','icons/icon-128.png',
 'branding-v069.css','premium-core-v069.js','premium-ui-v069.js','premium-v069.css',
 'resources-v069.css','resources-v069.js','resources.html',
 'clip-graphics.js','clip-project.js','clip-studio.html','clip-studio.js',
 'editor.html','manifest.json','popup.html','recorder.html','visual-inspector-v068.js'
}
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def digest(data):return hashlib.sha256(data).hexdigest()
def put(z,name,data):
 info=ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
 z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def package(out):
 base=git('rev-parse',BASE+'^{commit}').decode().strip()
 head=git('rev-parse','HEAD').decode().strip()
 changed=set(git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines())
 runtime={p for p in changed if
  ('/' not in p and Path(p).suffix in {'.js','.css','.html','.json'}) or
  p.startswith('icons/') or p.startswith('assets/')}
 if runtime!=FILES:raise RuntimeError('Unexpected extension diff: '+repr(sorted(runtime^FILES)))
 meta=[];data={}
 for filename in sorted(FILES):
  body=(ROOT/filename).read_bytes()
  if not body:raise RuntimeError('Empty runtime path '+filename)
  data[filename]=body
  try:previous=git('show',BASE+':'+filename)
  except subprocess.CalledProcessError:previous=None
  meta.append({'path':filename,'size_bytes':len(body),'sha256':digest(body),
   'previous_sha256':digest(previous) if previous is not None else None})
 manifest=json.loads(data['manifest.json'])
 if manifest['version']!='0.6.9':raise RuntimeError('Wrong version')
 html=data['clip-studio.html']
 for filename in ('premium-core-v069.js','premium-ui-v069.js','premium-v069.css','branding-v069.css'):
  if filename.encode() not in html:raise RuntimeError('Missing script/style wiring '+filename)
 if html.find(b'premium-core-v069.js')>html.find(b'clip-graphics.js'):
  raise RuntimeError('Premium compositor must load ahead of MangoGraphics')
 for asset in ('assets/mangoshot-wordmark.webp','assets/mangoshot-icon.webp'):
  if not data[asset].startswith(b'RIFF') or data[asset][8:12]!=b'WEBP':raise RuntimeError('Brand WebP invalid')
 for icon in ('16','32','48','128'):
  if not data['icons/icon-'+icon+'.png'].startswith(bytes.fromhex('89504e470d0a1a0a')):
   raise RuntimeError('Icon PNG invalid')
 readme='''# MangoShot v0.6.9 PREMIUM STUDIO / BRANDING — ROOT OVERLAY

REQUIRES an unpacked v0.6.8-visual-alpha.1 installation. NOT standalone.

1. Save important recordings and project JSON, and back up the existing extension folder.
2. Extract this zip into the SAME directory containing manifest.json, overwriting files.
3. Ensure assets/mangoshot-wordmark.webp and assets/mangoshot-icon.webp are present.
4. Reload at chrome://extensions or edge://extensions; Firefox: about:debugging.
5. Open Clip Studio > Callouts > Premium for 24 local Canvas compositions.
6. Use the Resources tab for direct external creative provider and license links.
7. Recording and local editing behavior should remain unchanged.
8. Roll back by restoring the v0.6.8 folder and reloading. Do NOT uninstall or clear
   local browser storage, as it may contain your recordings.

This is a development alpha. Premium materials simulate gloss/metal/glass using
Canvas2D, not true WebGL optical refraction. External assets remain subject to
their provider-specific license. Verify Chrome/Edge/Firefox and Wacom manually.
'''
 header={'release':'v0.6.9 premium brand alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.9','install_at':'unpacked extension root holding manifest.json',
 'files':meta,'untouched':['background.js','recorder.js','editor.js','capture-store.js']}
 out.mkdir(parents=True,exist_ok=True);target=out/NAME
 with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for filename,body in sorted(data.items()):put(z,filename,body)
  put(z,'README-OVERLAY.md',readme.encode())
  put(z,'PATCH-MANIFEST.json',(json.dumps(header,indent=2)+'\n').encode())
 with ZipFile(target) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise RuntimeError('Corrupt or incomplete patch')
  for filename,body in data.items():
   if z.read(filename)!=body:raise RuntimeError('Mismatched overlay file '+filename)
 print('PASS',target,'size',target.stat().st_size,'sha256',digest(target.read_bytes()))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',default='dist');args=p.parse_args()
 package(Path(args.out).resolve())
