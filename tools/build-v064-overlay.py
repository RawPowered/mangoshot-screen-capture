#!/usr/bin/env python3
"""Validated MangoShot 0.6.3 -> 0.6.4 in-place unpacked extension overlay."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
BASE='v0.6.3-hud-alpha.1'
ROOT=Path(__file__).resolve().parents[1]
NAME='MangoShot-v0.6.4-visual-overlay-from-v0.6.3.zip'
FILES={'zoom-hud-v063.js','visual-controls-v064.js','studio-v064.css',
       'clip-studio.html','clip-studio.js','manifest.json'}
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def sha(b):return hashlib.sha256(b).hexdigest()
def add(z,name,data):
 meta=ZipInfo(name,date_time=(2026,1,1,0,0,0))
 meta.compress_type=ZIP_DEFLATED
 meta.external_attr=0o644<<16
 z.writestr(meta,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(output):
 base=git('rev-parse',BASE+'^{commit}').decode().strip()
 commit=git('rev-parse','HEAD').decode().strip()
 paths=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={x for x in paths if '/' not in x and Path(x).suffix in ('.js','.css','.html','.json')}
 if runtime!=FILES:raise ValueError('Unexpected runtime patch: '+repr(sorted(runtime^FILES)))
 data,details={},[]
 for file in sorted(FILES):
  raw=(ROOT/file).read_bytes()
  if not raw:raise ValueError('Missing runtime file '+file)
  data[file]=raw
  try:before=git('show',BASE+':'+file)
  except subprocess.CalledProcessError:before=None
  details.append({'path':file,'bytes':len(raw),'sha256':sha(raw),
      'prior_sha256':sha(before) if before is not None else None})
 if json.loads(data['manifest.json'])['version']!='0.6.4':raise ValueError('Wrong extension manifest version')
 for asset in ('visual-controls-v064.js','studio-v064.css'):
  if asset.encode() not in data['clip-studio.html']:raise ValueError('Missing runtime script/CSS '+asset)
 if b'MangoVisualClip?.refresh?.()' not in data['clip-studio.js']:raise ValueError('Visual inspector not connected to editing timeline')
 help_text='''# MangoShot v0.6.4 — Visual Clip + Resizable Zoom OVERLAY
REQUIRES an installed v0.6.3-hud-alpha.1 unpacked extension (manifest 0.6.3).
This is NOT the complete package for fresh installations.

1. Save/export existing recordings, voiceover and edit projects.
2. Back up the complete existing unpacked extension folder.
3. Extract these files DIRECTLY INTO that SAME folder containing manifest.json.
   Confirm "overwrite" if prompted. Do not create a nested folder.
4. Reload the extension via chrome://extensions or edge://extensions. In Firefox
   reselect manifest.json under about:debugging#/runtime/this-firefox.
5. Open Clip Studio. Check the Camera preview now shows an actual source frame.
   Drag the lime box or resize a corner. Check Clip visual In/Out and icon tools.
6. To roll back, restore your backed-up files in the SAME folder then reload.
   Never uninstall or erase browser-local recordings during rollback.

The overlay leaves background screenshot recording engine, recorder and media
storage untouched. It DOES NOT add secondary-video compositing. A2 narration
is still session-local; download its source audio before closing Clip Studio.
'''
 meta={'version':'0.6.4','base_tag':BASE,'base_commit':base,'commit':commit,
       'installation':'unpacked extension root containing manifest.json',
       'changed_files':details,'excluded':['recorder.js','background.js','editor.js','extension-local media storage']}
 output.mkdir(parents=True,exist_ok=True)
 dst=output/NAME
 with ZipFile(dst,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for file,raw in sorted(data.items()):add(z,file,raw)
  add(z,'README-OVERLAY.md',help_text.encode('utf-8'))
  add(z,'PATCH-MANIFEST.json',(json.dumps(meta,indent=2)+'\n').encode('utf-8'))
 with ZipFile(dst) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise RuntimeError('ZIP CRC/member integrity failure')
  for file,raw in data.items():
   if z.read(file)!=raw:raise RuntimeError('ZIP member hash/content mismatch '+file)
 print('PASS: overlay',dst,'files',len(FILES),'bytes',dst.stat().st_size,'SHA256',sha(dst.read_bytes()))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',default='dist');a=p.parse_args()
 build(Path(a.out).resolve())
