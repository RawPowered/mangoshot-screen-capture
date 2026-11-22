#!/usr/bin/env python3
"""Build a verified MangoShot v0.6.0 -> v0.6.1 creative workspace root overlay."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
BASE='v0.6.0-workspace-alpha.1'
NAME='MangoShot-v0.6.1-creative-overlay-from-v0.6.0.zip'
FILES={'clip-studio.html','clip-studio.js','clip-graphics.js','clip-graphics-ui.js','clip-media-bin.js','project-v2.js','manifest.json','creative-zoom.js','voiceover.js','creative-studio-ui.js','studio-v061.css'}
def git(*args):return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.STDOUT)
def sha(b):return hashlib.sha256(b).hexdigest()
def add(z,name,data):
 info=ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
 z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(out):
 changed=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={x for x in changed if '/' not in x and Path(x).suffix in {'.js','.css','.html','.json'}}
 if runtime!=FILES:raise RuntimeError('Unexpected runtime diff: '+repr(sorted(runtime^FILES)))
 head=git('rev-parse','HEAD').decode().strip();old=git('rev-parse',BASE+'^{commit}').decode().strip()
 data={};files=[]
 for path in sorted(FILES):
  content=(root/path).read_bytes()
  if not content:raise RuntimeError('Missing empty file: '+path)
  data[path]=content
  try:previous=git('show',BASE+':'+path)
  except subprocess.CalledProcessError:previous=None
  files.append({'path':path,'sha256':sha(content),'bytes':len(content),'old_sha256':sha(previous) if previous is not None else None})
 if json.loads(data['manifest.json'])['version']!='0.6.1':raise RuntimeError('Invalid manifest version')
 for path in ['creative-zoom.js','voiceover.js','creative-studio-ui.js','studio-v061.css']:
  if path not in data['clip-studio.html'].decode():raise RuntimeError('Missing Clip Studio dependency '+path)
 instructions='''# MangoShot v0.6.1 Creative Tools Alpha 2 — ROOT OVERLAY
REQUIRES: v0.6.0 Workspace Alpha 1 installed (manifest version 0.6.0).
This is NOT a standalone fresh installation.
1. Save all recordings/projects and DOWNLOAD any voiceover source audio.
2. Back up your existing unpacked extension folder.
3. Extract the ZIP contents DIRECTLY over files in the SAME MangoShot
   directory containing manifest.json; do not create an extra folder.
4. Reload at chrome://extensions or edge://extensions. For temporary Firefox
   installs, reselect manifest.json in about:debugging.
5. Open Clip Studio: File > Export/Render, Properties in right inspector,
   test text callout presets, CAM zoom, and A2 voice recording.
The overlay does not replace background screenshot/recorder source code,
nor remove your browser-local recording storage.
Rollback: restore your prior extension directory files in the same path
and reload. Do not uninstall or clear browser data during rollback.
Known limitation: secondary imported video/images remain staging-only
and do not render; narration is session-local and must be downloaded.
'''
 meta={'patch':'v0.6.1 creative tools','base_tag':BASE,'base_commit':old,'target_commit':head,
       'target_manifest_version':'0.6.1','install_at':'extension root (manifest.json directory)','files':files,
       'preserved':['background.js','recorder.js','editor.js','browser-local data']}
 out.mkdir(parents=True,exist_ok=True);target=out/NAME
 with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for path,content in sorted(data.items()):add(z,path,content)
  add(z,'README-OVERLAY.md',instructions.encode())
  add(z,'PATCH-MANIFEST.json',(json.dumps(meta,indent=2)+'\n').encode())
 with ZipFile(target) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:raise RuntimeError('Invalid overlay ZIP')
  for path,content in data.items():
   if z.read(path)!=content:raise RuntimeError('Archive contents mismatch: '+path)
 print('OK',target,'files',len(FILES),'bytes',target.stat().st_size,'SHA256',sha(target.read_bytes()))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',default='dist');a=p.parse_args();build(Path(a.out).resolve())
