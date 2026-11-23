#!/usr/bin/env python3
"""MangoShot v0.6.12 strict layer and masking overlay from v0.6.11 Image Studio alpha."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.11-image-studio-alpha.1'
NAME='MangoShot-v0.6.12-layer-studio-overlay-from-v0.6.11.zip'
FILES={'editor.js','editor.html','manifest.json','image-editor-core-v0611.js',
       'image-layers-v0612.js','image-studio-v0612.css'}
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
 if manifest['version']!='0.6.12':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('image-editor-core-v0611.js','image-studio-v0611.css','image-layers-v0612.js','image-studio-v0612.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-context-menu',b'text-inline-input',b'copy-image',b'text-selection-box',b'image-panel-layers',b'image-panel-type',b'image-panel-mask',b'image-import-file'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'commitInline(',b'function importImages(',b'function moveLayerAt(',b'maskDraw.path.points.push('):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.12 LAYER STUDIO — ROOT OVERLAY

Requires an unpacked v0.6.11-image-studio-alpha.1 extension. Not standalone.
1. Back up the entire extension folder and important captures/projects.
2. Extract directly into the SAME folder containing manifest.json, overwriting matching files.
3. Reload from chrome://extensions or edge://extensions. Firefox: about:debugging.
4. Open Image Studio; import a PNG, JPEG or WebP as an editable image layer.
5. Use the Layers tab for visibility, lock, order, duplicate, delete, opacity and transforms.
6. Use Type for 6 system font families and Text / Title / Label / Callout presets.
7. Select an imported image and use Mask Erase / Restore to paint non-destructively.
8. Quick Cutout (beta) removes only simple edge-connected flat-color backgrounds.
   IT IS NOT AI BACKGROUND REMOVAL AND MAY FAIL ON COMPLEX SCENES.
9. Copy image, export PNG/PDF and the screenshot capture pipeline remain unchanged.

ROLLBACK: restore the backed-up v0.6.11 extension root and reload.
Do not uninstall or clear browser-local storage (captures may be stored there).
Imported images and mask edits are currently in-memory until export; keep a PNG
of final output before closing. A native editable project format is planned.
Manual Chrome/Edge/Firefox and Wacom validation still required.
'''
 header={'release':'v0.6.12 layer studio alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.12','install_at':'unpacked extension root holding manifest.json',
 'files':meta,'untouched':['background.js','popup.js','recorder.js','capture-store.js','content.js']}
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
