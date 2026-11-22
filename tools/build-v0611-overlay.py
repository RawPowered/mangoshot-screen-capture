#!/usr/bin/env python3
"""MangoShot v0.6.11 strict image editing overlay from v0.6.10 capture alpha."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.10-capture-layer-alpha.1'
NAME='MangoShot-v0.6.11-image-editor-overlay-from-v0.6.10.zip'
FILES={'editor.js','editor.html','manifest.json',
       'image-editor-core-v0611.js','image-studio-v0611.css'}
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
 if manifest['version']!='0.6.11':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('image-editor-core-v0611.js','image-studio-v0611.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-context-menu',b'text-inline-input',b'copy-image',b'text-selection-box'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'commitInline(',b'selectedStroke('):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.11 IMAGE STUDIO ROOT OVERLAY

REQUIRES an unpacked v0.6.10-capture-layer-alpha.1 extension.
This is NOT standalone and must not be overlaid onto older versions.

1. Back up the existing unpacked extension folder and important captures/projects.
2. Extract this ZIP into that SAME folder containing manifest.json.
3. Reload MangoShot in chrome://extensions or edge://extensions.
   For a Firefox temporary extension reload under about:debugging.
4. Capture a page and open Image Studio.
5. Right-click inside the screenshot for Copy full image with annotations;
   use Copy image at the top as an alternative. This copies full source size,
   not just the currently visible/zoomed section.
6. Choose Text, click the image, type and press Enter to place.
   Shift+Enter inserts a line break; Esc cancels. Select and drag text to move;
   double-click to edit. Ctrl+Z restores edits.
7. Text, Title, Label, Callout styles and basic font/size controls are in Properties.
8. Copy requires secure-context ClipboardItem PNG support and a user gesture.
   If the browser blocks it, Export PNG remains available.

ROLLBACK: restore the backed-up v0.6.10 folder and reload. Do NOT uninstall
or clear extension storage; captures/recordings may be stored locally.
This is a development alpha and still needs browser/Wacom visual testing.
'''
 header={'release':'v0.6.11 image editor alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.11','install_at':'unpacked extension root holding manifest.json',
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
