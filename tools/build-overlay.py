#!/usr/bin/env python3
"""MangoShot v0.6 workspace: extract-over-v0.5.7 overlay packager."""
import json, hashlib, argparse, subprocess
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
root=Path(__file__).resolve().parent.parent
base='v0.5.7-preview.1'
files={'clip-studio.html','clip-studio.js','manifest.json','media-assets.js','project-v2.js','clip-media-bin.js','clip-workspace-ui.js','studio-v06.css'}
name='MangoShot-v0.6.0-workspace-overlay-from-v0.5.7.zip'
def git(*args):return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.STDOUT)
def sha(b):return hashlib.sha256(b).hexdigest()
def write(z,path,content):
 info=ZipInfo(path,date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
 z.writestr(info,content,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(out):
 prior=git('rev-parse',base+'^{commit}').decode().strip()
 head=git('rev-parse','HEAD').decode().strip()
 changed=git('diff','--name-only','--diff-filter=ACMRT',base,'HEAD').decode().splitlines()
 runtime={x for x in changed if '/' not in x and Path(x).suffix in ('.js','.css','.html','.json')}
 if runtime!=files:raise RuntimeError('Runtime diff mismatch: '+repr(sorted(runtime^files)))
 blobs={};metadata=[]
 for path in sorted(files):
  b=(root/path).read_bytes()
  if not b:raise RuntimeError('Missing or empty '+path)
  blobs[path]=b
  try:before=git('show',base+':'+path)
  except subprocess.CalledProcessError:before=None
  metadata.append({'path':path,'bytes':len(b),'sha256':sha(b),'old_sha256':sha(before) if before is not None else None})
 if json.loads(blobs['manifest.json'])['version']!='0.6.0':raise RuntimeError('Not v0.6.0')
 for dependency in ('media-assets.js','project-v2.js','clip-media-bin.js','clip-workspace-ui.js','studio-v06.css'):
  if dependency not in blobs['clip-studio.html'].decode():raise RuntimeError('Missing HTML dependency '+dependency)
 instructions='''# MangoShot v0.6 workspace overlay — development test build
Apply ONLY to an existing v0.5.7-preview.1 unpacked extension.
1. Export recordings and project files. Back up the entire extension folder.
2. Verify its manifest.json currently says 0.5.7.
3. Extract/overwrite this ZIP's files DIRECTLY into that SAME folder
   containing manifest.json; do not add another nested directory.
4. Reload at chrome://extensions or edge://extensions.
   Firefox temporary extension: reopen manifest.json at about:debugging.
5. Test Clip Studio.
The overlay does not replace screenshot/recorder engines or browser data.
Rollback: restore your backed-up folder files to the SAME path and Reload.
WARNING: Imported secondary image/video/audio are staged ONLY.
They do not yet render in the Program Monitor or exported video.
'''
 patch={'base_tag':base,'base_commit':prior,'target_commit':head,
        'target_manifest_version':'0.6.0',
        'install_at':'existing unpacked extension root containing manifest.json',
        'files':metadata,'secondary_media':'staged, not composited/exported'}
 out.mkdir(parents=True,exist_ok=True);dst=out/name
 with ZipFile(dst,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for path,b in blobs.items():write(z,path,b)
  write(z,'README-OVERLAY.md',instructions.encode())
  write(z,'PATCH-MANIFEST.json',(json.dumps(patch,indent=2)+'\n').encode())
 with ZipFile(dst) as z:
  if z.testzip() or set(z.namelist()) != files | {'README-OVERLAY.md','PATCH-MANIFEST.json'}:raise RuntimeError('Invalid overlay ZIP')
  for path,b in blobs.items():
   if z.read(path)!=b:raise RuntimeError('Corrupted ZIP file '+path)
 print('BUILT',dst,'SHA256',sha(dst.read_bytes()),'BYTES',dst.stat().st_size)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',default='dist');args=p.parse_args()
 build(Path(args.out).resolve())
