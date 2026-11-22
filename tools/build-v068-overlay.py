#!/usr/bin/env python3
"""MangoShot v0.6.8 strict extension-root overlay from v0.6.7."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.7-motion-alpha.1'
NAME='MangoShot-v0.6.8-visual-overlay-from-v0.6.7.zip'
FILES={'visual-inspector-v068.js','studio-v068.css',
       'motion-ui-v067.js','clip-studio.html','manifest.json'}
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
 if json.loads(data['manifest.json'])['version']!='0.6.8':raise RuntimeError('Unexpected manifest version')
 for name in ['studio-v068.css','visual-inspector-v068.js','motion-ui-v067.js']:
  if name.encode() not in data['clip-studio.html']:raise RuntimeError('HTML missing '+name)
 if data['clip-studio.html'].find(b'motion-ui-v067.js')>data['clip-studio.html'].find(b'visual-inspector-v068.js'):raise RuntimeError('Wrong visual inspector initialization order')
 readme='''# MangoShot v0.6.8 Visual Inspector — ROOT OVERLAY
REQUIRES v0.6.7-motion-alpha.1 unpacked extension as baseline.
This overlay is NOT a standalone extension.

1. Export important recordings, voiceovers and edit project JSON.
2. Back up the ENTIRE unpacked v0.6.7 extension folder.
3. Extract directly into the SAME folder holding manifest.json.
4. Reload in chrome://extensions or edge://extensions; Firefox about:debugging.
5. Callouts: use Design, Motion, Numbers and Advanced sub-tabs.
   Motion and transitions have visual cards, timing sliders and exact drawers.
6. Clip: use Edit and Transitions sub-tabs. Select clip 2 or later.
7. Preview effects using the Program Monitor; original project contracts are retained.

ROLLBACK: restore the backup folder and reload. Do not uninstall extension or
clear local browser data. This is alpha software: manually test rendering and
stylus/keyboard UI before treating it as production-stable.
'''
 meta={'release':'v0.6.8 visual inspector alpha 1','baseline':BASE,'baseline_commit':old,
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
