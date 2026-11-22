#!/usr/bin/env python3
"""Produce MangoShot v0.6.2 root overlay for v0.6.1 Creative Alpha installations."""
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
import argparse,hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.1-creative-alpha.1'
NAME='MangoShot-v0.6.2-ux-overlay-from-v0.6.1.zip'
FILES={'clip-studio.html','clip-studio.js','manifest.json','clip-workspace-v062.js','studio-v062.css'}
def git(*args):
 return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def sha(data):return hashlib.sha256(data).hexdigest()
def append(z,name,data):
 meta=ZipInfo(name,date_time=(2026,1,1,0,0,0))
 meta.compress_type=ZIP_DEFLATED;meta.external_attr=0o644<<16
 z.writestr(meta,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(output):
 base=git('rev-parse',BASE+'^{commit}').decode().strip()
 head=git('rev-parse','HEAD').decode().strip()
 changed=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={p for p in changed if '/' not in p and Path(p).suffix in ('.js','.css','.html','.json')}
 if runtime!=FILES:raise ValueError('Unexpected runtime diff '+repr(sorted(runtime^FILES)))
 data,entries={},[]
 for p in sorted(FILES):
  body=(ROOT/p).read_bytes()
  if not body:raise ValueError('Empty runtime file '+p)
  data[p]=body
  try:prior=git('show',BASE+':'+p)
  except subprocess.CalledProcessError:prior=None
  entries.append({'path':p,'bytes':len(body),'sha256':sha(body),'previous_sha256':sha(prior) if prior else None})
 if json.loads(data['manifest.json'])['version']!='0.6.2':raise ValueError('Expected 0.6.2')
 if b'clip-workspace-v062.js' not in data['clip-studio.html'] or b'studio-v062.css' not in data['clip-studio.html']:
  raise ValueError('Missing HTML workspace dependency')
 if b'MangoUnifiedV062?.rejoin?.()' not in data['clip-studio.js']:
  raise ValueError('Clip redraw does not rejoin the unified media lane')
 instructions="""# MangoShot v0.6.2 Focused Workspace UX — Root Overlay
REQUIRES: v0.6.1-creative-alpha.1 previously installed (manifest version 0.6.1).
THIS ZIP IS NOT A STANDALONE BROWSER EXTENSION.
1. Export important recordings/projects and back up your complete extension folder.
2. Verify your folder's manifest.json reports 0.6.1.
3. Extract the ZIP directly into the SAME unpacked MangoShot extension folder,
   over the existing files. Do NOT create a nested directory.
4. Reload in chrome://extensions or edge://extensions. For a Firefox temporary
   add-on, reselect manifest.json in about:debugging#/runtime/this-firefox.
5. Test File > Projects, Edit > Preferences > Keyboard Shortcuts, Properties tabs,
   the lower Media Bin and generating thumbnails and A1 waveform in V1/A1.
6. Roll back by restoring the backed-up extension files at the identical path;
   do not uninstall or clear browser storage.
This patch does not replace recorder/screenshot engines or touch local recordings.
Known limits: secondary imported video/audio/images are staging-only; A2 recorded
voiceover remains session-local and should be downloaded before closing.
"""
 manifest={'patch':'v0.6.2 focused workspace UX','base_tag':BASE,'base_commit':base,
  'target_commit':head,'target_manifest_version':'0.6.2',
  'install_location':'existing unpacked extension root containing manifest.json',
  'changed_files':entries,'preserved':['background.js','recorder.js','editor.js','browser-local recordings'],
  'media_note':'Thumbnail and waveform are display layers inside the actual synchronized V1/A1 segment bar.'}
 output.mkdir(parents=True,exist_ok=True)
 target=output/NAME
 with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for p,body in data.items():append(z,p,body)
  append(z,'README-OVERLAY.md',instructions.encode('utf8'))
  append(z,'PATCH-MANIFEST.json',(json.dumps(manifest,indent=2)+'\n').encode())
 with ZipFile(target) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise ValueError('Invalid overlay member set / CRC')
  for p,body in data.items():
   if z.read(p)!=body:raise ValueError('Mismatched member '+p)
 print('OK',target,'bytes',target.stat().st_size,'sha256',sha(target.read_bytes()))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist');args=parser.parse_args()
 build(Path(args.out).resolve())
