#!/usr/bin/env python3
"""Root-level MangoShot v0.6.2 -> v0.6.3 update overlay."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.2-ux-alpha.1'
NAME='MangoShot-v0.6.3-hud-overlay-from-v0.6.2.zip'
FILES={'zoom-hud-v063.js','type-hud-v063.js','studio-v063.css','clip-studio.html',
       'clip-studio.js','clip-graphics.js','clip-graphics-ui.js','creative-studio-ui.js',
       'clip-project.js','manifest.json'}
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def sha(data):return hashlib.sha256(data).hexdigest()
def add(z,path,data):
 info=ZipInfo(path,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
 z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(output):
 head=git('rev-parse','HEAD').decode().strip()
 old=git('rev-parse',BASE+'^{commit}').decode().strip()
 paths=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={p for p in paths if '/' not in p and Path(p).suffix in {'.js','.css','.html','.json'}}
 if runtime!=FILES:raise RuntimeError('Runtime patch differs from expected set: '+repr(sorted(runtime^FILES)))
 data,entries={},[]
 for p in sorted(FILES):
  content=(ROOT/p).read_bytes()
  if not content:raise RuntimeError('Missing overlay runtime file '+p)
  data[p]=content
  try:prior=git('show',BASE+':'+p)
  except subprocess.CalledProcessError:prior=None
  entries.append({'path':p,'bytes':len(content),'sha256':sha(content),
                  'previous_sha256':sha(prior) if prior is not None else None})
 if json.loads(data['manifest.json'])['version']!='0.6.3':raise RuntimeError('Manifest version mismatch')
 html=data['clip-studio.html']
 for p in ['zoom-hud-v063.js','type-hud-v063.js','studio-v063.css']:
  if p.encode() not in html:raise RuntimeError('Missing Clip Studio dependency '+p)
 if b'addZoomRange(' not in data['clip-studio.js'] or b'updateZoomKeyframe(' not in data['clip-studio.js']:
  raise RuntimeError('Camera editor update functions missing')
 instructions='''# MangoShot v0.6.3 Interactive Camera + Typography Overlay
REQUIRES v0.6.2-ux-alpha.1 as the unpacked extension (manifest 0.6.2).
This ZIP is NOT a complete extension for a clean installation.

1. Export important recordings and projects; back up the entire extension folder.
2. Verify your current folder's manifest.json says version 0.6.2.
3. Extract this ZIP directly OVER the SAME folder that contains manifest.json;
   do not create a nested folder.
4. Reload MangoShot at chrome://extensions or edge://extensions. Firefox's
   temporary extension: reload manifest.json in about:debugging.
5. In Clip Studio: Properties > Camera: drag the zoom HUD rectangle; test
   Zoom In / Zoom Out and editing selected camera events. Properties > Callouts:
   choose a visual style and font, edit text, and expand advanced drawers.
6. To roll back, restore your backed-up files at the original extension path,
   then Reload. Do not uninstall or clear your browser-local recordings.

Preserved: screenshot and recorder engines, primary editor, local capture history.
Unsupported: secondary imported video/images are staging-only.
Voiceovers remain session-local until downloaded separately.
'''
 meta={'version':'0.6.3','base':BASE,'base_commit':old,'commit':head,
       'extract_into':'existing unpacked extension root containing manifest.json',
       'runtime_files':entries,'note':'No recording/capture source or local media storage is modified'}
 output.mkdir(parents=True,exist_ok=True);target=output/NAME
 with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for p,blob in sorted(data.items()):add(z,p,blob)
  add(z,'README-OVERLAY.md',instructions.encode('utf8'))
  add(z,'PATCH-MANIFEST.json',(json.dumps(meta,indent=2)+'\n').encode())
 with ZipFile(target) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise RuntimeError('ZIP integrity or member-list failure')
  for p,blob in data.items():
   if z.read(p)!=blob:raise RuntimeError('Archive file differs from source '+p)
 print('OK',target,'bytes',target.stat().st_size,'sha256',sha(target.read_bytes()))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist');args=parser.parse_args()
 build(Path(args.out).resolve())
