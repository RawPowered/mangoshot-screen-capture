#!/usr/bin/env python3
"""MangoShot v0.6.6 strict extension-root overlay from v0.6.5."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.5-dock-alpha.1'
NAME='MangoShot-v0.6.6-polish-overlay-from-v0.6.5.zip'
FILES={'workspace-resize-v066.js','preset-pack-v066.js','polish-icons-v066.js',
       'studio-v066.css','clip-graphics.js','type-hud-v063.js',
       'clip-media-bin.js','clip-studio.html','manifest.json'}
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
 if json.loads(data['manifest.json'])['version']!='0.6.6':raise RuntimeError('Unexpected manifest version')
 for name in ['studio-v066.css','workspace-resize-v066.js','preset-pack-v066.js','polish-icons-v066.js']:
  if name.encode() not in data['clip-studio.html']:raise RuntimeError('HTML missing '+name)
 if data['clip-studio.html'].find(b'type-hud-v063.js')>data['clip-studio.html'].find(b'preset-pack-v066.js'):raise RuntimeError('Wrong preset initialization order')
 readme='''# MangoShot v0.6.6 Workspace Polish — ROOT OVERLAY
REQUIRES v0.6.5-dock-alpha.1 installed as the unpacked extension (manifest 0.6.5).
This overlay is NOT a standalone fresh extension.

1. Save/export important recordings, voiceover source, and project JSON.
2. Back up the entire existing unpacked MangoShot extension directory.
3. Extract directly over the SAME folder containing manifest.json; overwrite
   changed files. Do not create an additional nested extension folder.
4. Reload extension in chrome://extensions or edge://extensions. For Firefox,
   reload the temporary extension in about:debugging.
5. Drag separators to resize Properties width, Monitor/Timeline and
   Timeline/Media heights. Double-click a divider to reset that dimension.
   Use Panels menu for Balance, Preview, Editing, Graphics and Timeline presets.
6. Choose Callouts > Studio II to preview the eight new native text/callout
   presets, select a style and Quick +Text / +Callout to insert.
7. Existing source/recording and editing decisions remain unchanged.
   Roll back by restoring the v0.6.5 folder IN PLACE and reloading. Do not
   uninstall or clear browser-local recordings.
Known limits: secondary imported video is staging-only. A2 voiceover media
remains session-local until downloaded. Small displays use responsive layout.
'''
 meta={'release':'v0.6.6 workspace polish alpha 7','baseline':BASE,'baseline_commit':old,
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
