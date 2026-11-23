#!/usr/bin/env python3
"""MangoShot v0.6.7 strict extension-root overlay from v0.6.6."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.6-polish-alpha.1'
NAME='MangoShot-v0.6.7-motion-overlay-from-v0.6.6.zip'
FILES={'motion-core-v067.js','motion-ui-v067.js','studio-v067.css',
       'clip-graphics.js','clip-graphics-ui.js','clip-media-bin.js','clip-project.js',
       'clip-studio.js','clip-studio.html','manifest.json'}
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def hashdata(blob):return hashlib.sha256(blob).hexdigest()
def member(z,name,data):
 info=ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED
 info.external_attr=0o644<<16;z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def package(output):
 old=git('rev-parse',BASE+'^{commit}').decode().strip()
 current=git('rev-parse','HEAD').decode().strip()
 changed=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={p for p in changed if '/' not in p and Path(p).suffix in {'.js','.css','.html','.json'}}
 if runtime!=FILES:raise RuntimeError('Unexpected extension diff '+repr(sorted(runtime^FILES)))
 data={};entries=[]
 for path in sorted(FILES):
  body=(ROOT/path).read_bytes()
  if not body:raise RuntimeError('Empty/missing runtime file '+path)
  data[path]=body
  try:prev=git('show',BASE+':'+path)
  except subprocess.CalledProcessError:prev=None
  entries.append({'path':path,'bytes':len(body),'sha256':hashdata(body),'previous_sha256':hashdata(prev) if prev is not None else None})
 if json.loads(data['manifest.json'])['version']!='0.6.7':raise RuntimeError('Unexpected manifest version')
 for name in ['studio-v067.css','motion-core-v067.js','motion-ui-v067.js']:
  if name.encode() not in data['clip-studio.html']:raise RuntimeError('HTML missing '+name)
 if data['clip-studio.html'].find(b'motion-core-v067.js')>data['clip-studio.html'].find(b'clip-graphics.js'):raise RuntimeError('Wrong motion initialization order')
 readme='''# MangoShot v0.6.7 Motion & Transitions — ROOT OVERLAY
REQUIRES v0.6.6-polish-alpha.1 already installed as unpacked extension.
This overlay is NOT a standalone extension and not for older baselines.

1. Save/export important recordings, voiceover source and project JSON.
2. Back up the entire current unpacked MangoShot extension folder.
3. Extract this ZIP directly over that SAME folder containing manifest.json.
4. Reload extension in chrome://extensions or edge://extensions.
   For Firefox, reload the temporary extension under about:debugging.
5. Select a text/callout layer, open Motion in Properties and configure
   entry, exit, typewriter, spin letters, number or timer effects.
6. Select a V1 clip after the first and open Opening Transition in Properties.
7. Export MP4/WebM through the existing edited Canvas renderer.

This alpha supports only one decoded source stream. Transition effects are
cut treatments, not true two-video crossfades; source audio follows hard cuts.
Avoid store deployment until browser/Wacom manual QA and export parity checks.
Rollback: restore the previous v0.6.6 extension folder and reload. Do NOT
uninstall or clear browser-local recordings.
'''
 meta={'release':'v0.6.7 motion alpha 1','baseline':BASE,'baseline_commit':old,
       'target_commit':current,'version':'0.6.6','install_at':'existing extension root containing manifest.json',
       'runtime_files':entries,'untouched':['background.js','recorder.js','editor.js','recording storage']}
 output.mkdir(parents=True,exist_ok=True);target=output/NAME
 with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for path,body in sorted(data.items()):member(z,path,body)
  member(z,'README-OVERLAY.md',readme.encode('utf8'))
  member(z,'PATCH-MANIFEST.json',(json.dumps(meta,indent=2)+'\n').encode('utf8'))
 with ZipFile(target) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise RuntimeError('Unexpected ZIP members or corrupt archive')
  for path,body in data.items():
   if z.read(path)!=body:raise RuntimeError('Archive differs from repository '+path)
 print('PASS',target,'bytes',target.stat().st_size,'SHA256',hashdata(target.read_bytes()))
if __name__=='__main__':
 args=argparse.ArgumentParser();args.add_argument('--out',default='dist');parsed=args.parse_args()
 package(Path(parsed.out).resolve())
