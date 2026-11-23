#!/usr/bin/env python3
"""MangoShot v0.6.15 strict editable vector tools + Clip UIX overlay from v0.6.14."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.14-quick-copy-alpha.1'
NAME='MangoShot-v0.6.15-vector-tools-overlay-from-v0.6.14.zip'
FILES={'clip-studio.html','clip-timeline-ui.js','clip-workspace-ui.js','editor.html',
       'editor.js','image-studio-v0615.css','image-vector-v0615.js','studio-v0615.css',
       'manifest.json'}
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
 if manifest['version']!='0.6.15':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('image-vector-v0615.js','image-studio-v0615.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-vector-library',b'image-active-tool-name',b'vector-selection-box',b'image-shape-fill-enabled'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'vectorCore.paint(',b'topLayerAt(',b'syncVectorControls(',b'vectorCore.resized('):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.15 — VECTOR TOOLS + SYNCHRONIZED UIX OVERLAY

REQUIRES unpacked v0.6.14-quick-copy-alpha.1; not standalone.

1. BACK UP the entire currently installed extension folder, especially manifest.json and assets.
2. Extract overlay over the SAME directory as manifest.json and overwrite files.
3. Reload the unpacked extension from edge://extensions or chrome://extensions;
   Firefox temporary extension reload: about:debugging.
4. IMAGE STUDIO: pick a left-rail tool. Correct properties tab now opens.
   Shape library adds editable rectangle, rounded rectangle, ellipse, line,
   arrow, triangle, diamond, pentagon, hexagon, star and speech bubble.
   Adjust stroke/fill, dashed/dotted lines, opacity, radius, star points,
   arrowhead style. Select an existing vector to edit; drag to move, use
   corner handles to resize proportionally, hold Shift to free-stretch.
5. CLIP STUDIO: Select/Razor/Range now show persistent active mode in
   toolbar and left rail; V/C/R shortcuts and timeline mode synchronize.
   Text, Callout and AutoCut are actions, not persistent modes.
6. Quick Copy, full-page capture, recorder, image layers, masking and
   text effects remain unchanged.

ROLLBACK: restore backed-up v0.6.14 folder and reload. Do NOT uninstall or
clear extension storage; important recordings may be saved locally.
Manual Chrome/Edge/Firefox and Wacom acceptance remains required.
'''
 header={'release':'v0.6.15 vector tools UIX alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.15','install_at':'unpacked extension root holding manifest.json',
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
