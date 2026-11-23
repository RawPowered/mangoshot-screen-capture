#!/usr/bin/env python3
"""MangoShot v0.6.4 -> v0.6.5 strict unpacked-extension root overlay."""
import argparse,hashlib,json,subprocess
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.4-visual-alpha.1'
NAME='MangoShot-v0.6.5-dock-shortcuts-overlay-from-v0.6.4.zip'
FILES={
 'clip-workspace-v062.js','studio-workspaces.js','clip-timeline-ui.js',
 'clip-studio.js','clip-studio.html','manifest.json','media-dock-v065.js',
 'studio-v065.css','tool-icons-v065.js','keyboard-shortcuts-v065.js'
}
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],stderr=subprocess.STDOUT)
def sha(data):return hashlib.sha256(data).hexdigest()
def add(z,name,data):
 info=ZipInfo(name,date_time=(2026,1,1,0,0,0))
 info.compress_type=ZIP_DEFLATED;info.external_attr=0o644<<16
 z.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
def build(out):
 prior=git('rev-parse',BASE+'^{commit}').decode().strip()
 target=git('rev-parse','HEAD').decode().strip()
 diff=git('diff','--name-only','--diff-filter=ACMRT',BASE,'HEAD').decode().splitlines()
 runtime={p for p in diff if '/' not in p and Path(p).suffix in ('.js','.css','.html','.json')}
 if runtime!=FILES:raise ValueError('Unexpected extension diff: '+repr(sorted(runtime^FILES)))
 contents={};details=[]
 for p in sorted(FILES):
  data=(ROOT/p).read_bytes()
  if not data:raise ValueError('Missing or empty overlay file '+p)
  contents[p]=data
  try:old=git('show',BASE+':'+p)
  except subprocess.CalledProcessError:old=None
  details.append({'path':p,'size':len(data),'sha256':sha(data),'previous_sha256':sha(old) if old is not None else None})
 if json.loads(contents['manifest.json'])['version']!='0.6.5':raise ValueError('Manifest mismatch')
 for path in ('studio-v065.css','media-dock-v065.js','tool-icons-v065.js','keyboard-shortcuts-v065.js'):
  if path.encode() not in contents['clip-studio.html']:raise ValueError('Missing Clip Studio dependency '+path)
 if b'MangoShortcuts?.active' not in contents['clip-timeline-ui.js']:raise ValueError('Timeline legacy shortcuts not gated')
 readme='''# MangoShot v0.6.5 — Pinned Media Library & Keyboard Shortcuts OVERLAY
REQUIRES: the v0.6.4-visual-alpha.1 unpacked extension (manifest 0.6.4).
THIS IS NOT A COMPLETE EXTENSION FOR NEW INSTALLATIONS.

1. Export important screen recordings, projects and session-only voiceover audio.
2. Back up the complete existing MangoShot extension folder.
3. Extract this ZIP DIRECTLY OVER the same extension folder containing
   manifest.json. Accept overwriting existing files. Do not add another folder.
4. Reload at chrome://extensions or edge://extensions, or reselect manifest.json
   in Firefox about:debugging under temporary extensions.
5. Confirm Media Library Import is pinned below the timeline and that browser
   document scrolling is no longer needed at standard desktop sizes.
6. Open Edit > Preferences > Keyboard Shortcuts (or Keys in the top menu bar).
   Rebind a shortcut, attempt a duplicate, reset, and test the resulting tool.
7. Roll back by restoring the backed-up extension files to the SAME directory,
   then reloading. Do not uninstall or clear browser-local recording storage.

Changed runtime files only; recorder/screenshot/source media engines unaffected.
Known limitations: imported secondary media is staging-only. Voiceover source
audio remains session-local until downloaded. Very small windows prioritize
accessibility over no-scroll constraints.
'''
 meta={'patch':'v0.6.5 Pinned Media Library + Keyboard Manager',
       'baseline':BASE,'baseline_commit':prior,'target_commit':target,
       'install_at':'existing unpacked extension root (manifest.json directory)',
       'target_manifest_version':'0.6.5','files':details,
       'preserved':['background.js','recorder.js','editor.js','local capture and recording data']}
 out.mkdir(parents=True,exist_ok=True)
 dest=out/NAME
 with ZipFile(dest,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
  for p,blob in sorted(contents.items()):add(z,p,blob)
  add(z,'README-OVERLAY.md',readme.encode('utf8'))
  add(z,'PATCH-MANIFEST.json',(json.dumps(meta,indent=2)+'\n').encode('utf8'))
 with ZipFile(dest) as z:
  if z.testzip() or set(z.namelist())!=FILES|{'README-OVERLAY.md','PATCH-MANIFEST.json'}:
   raise ValueError('Overlay ZIP member/CRC validation failed')
  for p,blob in contents.items():
   if z.read(p)!=blob:raise ValueError('Overlay bytes differ from repository: '+p)
 print('PASS',str(dest),'SHA256',sha(dest.read_bytes()),'BYTES',dest.stat().st_size)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist')
 args=parser.parse_args();build(Path(args.out).resolve())
