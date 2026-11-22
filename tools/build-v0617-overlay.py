#!/usr/bin/env python3
"""MangoShot v0.6.17 strict keyboard shortcuts and dual editor menus overlay from v0.6.16."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.16-wacom-erasers-alpha.1'
NAME='MangoShot-v0.6.17-shortcut-menus-overlay-from-v0.6.16.zip'
FILES={'clip-studio.html','editor.html','editor.js','keyboard-shortcuts-v065.js',
       'manifest.json','shortcut-core-v0617.js','studio-shortcuts-v0617.js',
       'studio-menus-v0617.js','studio-v0617.css'}
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
 if manifest['version']!='0.6.17':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('shortcut-core-v0617.js','studio-shortcuts-v0617.js','studio-menus-v0617.js','studio-v0617.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-shortcuts-dialog',b'studio-command-palette',b'data-studio-action="showShortcuts"',b'data-key-for="undo"'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'run:imageCommand',b'if(globalThis.MangoShortcutsV0617?.active)return;'):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.17 — SHORTCUTS & COMMAND MENUS

REQUIRES unpacked v0.6.16-wacom-erasers-alpha.1; not standalone.

1. Back up the entire existing unpacked MangoShot folder containing manifest.json.
2. Extract this ZIP directly into that root, overwriting changed files.
3. Reload the unpacked extension in edge://extensions or chrome://extensions;
   Firefox temporary extension: about:debugging.
4. IMAGE STUDIO now has File/Edit/Layer/View/Tools/Help menus, a searchable
   command palette, and editable keyboard shortcut settings.
5. CLIP STUDIO keeps existing commands but adds matching command palette,
   richer menu shortcuts and updated keybinding preferences. Legacy Clip
   custom bindings migrate locally on first load (not uploaded to a cloud).
6. Open Help > Keyboard shortcuts, or press ? (Shift+/); click a binding to
   record a replacement; duplicate or reserved browser shortcuts are rejected.
   Filter commands, reset defaults, and export/import versioned JSON profiles.
7. Open Help > Search commands, or use Ctrl+Alt+K. Type an action name,
   navigate with up/down arrows and press Enter. Escape dismisses.
8. Shortcuts do not fire while typing text or composing IME text; browser
   reserved shortcuts remain untouched. Tooltips and menu keys update.
9. Verify Ctrl+Z, tool keys, Copy PNG, Layer Delete and Timeline Razor/V/C/R
   still use existing editing operations.

ROLLBACK: restore backed-up v0.6.16 extension folder and reload it.
Do not uninstall or clear extension storage: recordings may remain local.
No additional permissions, no external servers and no cloud sync were added.
Browser/manual accessibility QA remains required before a stable release.
'''
 header={'release':'v0.6.17 shortcuts and menus alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.17','install_at':'unpacked extension root holding manifest.json',
 'files':meta,'untouched':['background.js','popup.js','recorder.js','capture-store.js','content.js']}
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
