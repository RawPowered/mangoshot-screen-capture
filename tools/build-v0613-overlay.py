#!/usr/bin/env python3
"""MangoShot v0.6.13 strict text FX and resize overlay from v0.6.12 Layer Studio alpha."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.12-layer-studio-alpha.1'
NAME='MangoShot-v0.6.13-type-effects-overlay-from-v0.6.12.zip'
FILES={'editor.js','editor.html','manifest.json','image-type-effects-v0613.js','image-studio-v0613.css'}
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
 if manifest['version']!='0.6.13':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('image-type-effects-v0613.js','image-studio-v0613.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'data-fx-group',b'data-fx-preset',b'data-resize-handle',b'data-resize-kind',b'image-keep-ratio'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'commitInline(',b'typeEffects?.draw',b'typeEffects.resize(',b'event.shiftKey||!locked'):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.13 — TYPE FX AND ON-CANVAS RESIZE

Requires v0.6.12-layer-studio-alpha.1 unpacked extension. Not standalone.

1. Back up the entire installed MangoShot extension folder and any final captures.
2. Extract into the SAME extension root containing manifest.json, overwriting files.
3. Reload the unpacked extension from edge://extensions or chrome://extensions.
4. Capture a screenshot, select any Text or imported Image layer, and drag the
   four corner handles. Ratio stays locked by default.
5. HOLD SHIFT while dragging a corner to independently stretch width and height.
   You may also uncheck "Lock proportions" in Layers for persistent free resize.
6. Select a text layer > Type > Layer effects. Try the seven editable presets,
   then tune shadow, outline, gradient overlay, color overlay, glow or plate.
7. Copy annotated image, export PNG, and export PDF to verify effects render
   identically to the preview. The original capture is never modified.
8. Ctrl+Z undoes a resize/effect change; Ctrl+Shift+Z redoes it.

ROLLBACK: restore your backed-up v0.6.12 folder and reload.
Do not uninstall/clear browser extension storage, which may hold recordings.

Image layers remain in-memory until final export. Editable project save/restore
has not yet shipped. This is a development alpha; manual Chrome/Edge/Firefox,
large-screenshot, clipboard, Wacom and zoom-level checks remain required.
'''
 header={'release':'v0.6.13 type fx alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.13','install_at':'unpacked extension root holding manifest.json',
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
