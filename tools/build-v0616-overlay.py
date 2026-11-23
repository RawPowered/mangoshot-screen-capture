#!/usr/bin/env python3
"""MangoShot v0.6.16 strict Wacom diagnostics and dual annotation erasers overlay from v0.6.15."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.15-vector-tools-alpha.1'
NAME='MangoShot-v0.6.16-wacom-erasers-overlay-from-v0.6.15.zip'
FILES={'editor.html','editor.js','image-studio-v0616.css','pen-input-v0616.js','manifest.json'}
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
 if manifest['version']!='0.6.16':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('pen-input-v0616.js','image-studio-v0616.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'pen-test-pad',b'image-eraser-hardness',b'image-pen-pressure',b'data-studio-tool="erase-stroke"'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'penInput?.paintEraser?.(pen,stroke)',b'function eraseEntireAt(',b'penInput?.eraserTip?.(event)',b'penInput?.createDiagnostic?.('):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.16 — WACOM DIAGNOSTIC + DUAL ERASERS

REQUIRES unpacked v0.6.15-vector-tools-alpha.1; not standalone.

1. Back up your MangoShot extension root including manifest.json and any local files.
2. Extract into the SAME extension root, overwriting matching files.
3. Reload at edge://extensions or chrome://extensions; Firefox about:debugging.
4. Open Image Studio > Tools > Wacom / Browser Pen Test. Draw with the
   pen lightly and firmly; inspect Device, Pressure range and Eraser tip.
5. Choose Brush Erase for partial, pressure-sensitive annotation erasing.
   Adjust diameter, edge hardness and opacity. Original screenshot remains.
6. Choose Whole Stroke Erase and sweep across strokes/shapes/text to delete
   the whole unlocked annotation; one drag is one Ctrl+Z operation.
7. When the driver sends a physical eraser-tip signal (pen button 5 /
   buttons bit 32), it temporarily uses the last chosen eraser mode.
   If unsupported, use the manual eraser tools. Mouse stays supported.
8. Test copying PNG, exporting PDF, layer undo and Wacom across browsers.

ROLLBACK: restore the saved v0.6.15 extension root and reload. Do NOT
uninstall or clear browser extension storage that may contain recordings.
No extra browser permissions and no cloud communication were added.
Manual hardware/browser QA remains required before stable.
'''
 header={'release':'v0.6.16 Wacom pressure and dual erasers alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.16','install_at':'unpacked extension root holding manifest.json',
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
