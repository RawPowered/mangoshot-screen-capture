#!/usr/bin/env python3
"""MangoShot v0.6.10 strict in-place overlay from v0.6.9 premium brand alpha."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.9-premium-brand-alpha.1'
NAME='MangoShot-v0.6.10-capture-layer-overlay-from-v0.6.9.zip'
FILES={
 'background.js','popup.js','clip-studio.js','clip-graphics-ui.js',
 'keyboard-shortcuts-v065.js','premium-ui-v069.js','visual-inspector-v068.js',
 'clip-studio.html','manifest.json','studio-v0610.css'
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
 if manifest['version']!='0.6.10':raise RuntimeError('Wrong version')
 html=data['clip-studio.html']
 if b'studio-v0610.css' not in html:raise RuntimeError('New UX stylesheet missing')
 if b'premium-ui-v069.js' not in html or b'visual-inspector-v068.js' not in html:
  raise RuntimeError('Editor integration dependencies missing')
 if b'v0610-quick-add' not in data['premium-ui-v069.js']:
  raise RuntimeError('Premium quick insert not shipped')
 if b'layer-remove' not in data['clip-graphics-ui.js']:
  raise RuntimeError('Layer delete UI missing')
 if b"MANGO_POPUP_INIT" not in data['background.js']:
  raise RuntimeError('Capture handshake missing')
 readme='''# MangoShot v0.6.10 — CAPTURE & LAYER UX ROOT OVERLAY

REQUIRES v0.6.9-premium-brand-alpha.1 ALREADY installed unpacked.
Do NOT apply to earlier version or standalone.

1. Save project JSON and important captures/recordings. Back up the complete unpacked extension folder.
2. Extract this ZIP into the SAME folder holding manifest.json, replacing matching files.
3. Confirm background.js, popup.js, clip-studio.js and studio-v0610.css have updated.
4. Reload the unpacked extension in chrome://extensions or edge://extensions.
   For Firefox use about:debugging and reload the temporary extension.
5. On a regular http(s) page, test Capture entire page and confirm Image Studio opens.
6. Clip Studio > Callouts > Premium: use + on a card or the sticky Add to timeline button.
7. Layers: use the always-visible delete control, per-layer delete, or keyboard Delete.
   Locked layers must be unlocked. Ctrl+Z restores deleted layers.

ROLLBACK: restore the complete backed-up v0.6.9 extension directory and reload.
Do not uninstall or clear browser-local data (captures may be stored there).
Automated worker protocol simulations pass; actual live full-page capture and
Chrome/Edge/Firefox/Wacom checks remain manual alpha acceptance.
'''
 header={'release':'v0.6.10 capture layer alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.10','install_at':'unpacked extension root holding manifest.json',
 'files':meta,'untouched':['recorder.js','editor.js','capture-store.js','content.js']}
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
