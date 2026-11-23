#!/usr/bin/env python3
"""MangoShot v0.6.18 strict layer copy/paste, Alt drag clone and appearance overlay from v0.6.17."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.17-shortcuts-alpha.1'
NAME='MangoShot-v0.6.18-layer-clipboard-alt-clone-overlay-from-v0.6.17.zip'
FILES={'editor.html','editor.js','image-layer-ops-v0618.js','image-studio-v0618.css',
       'manifest.json','shortcut-core-v0617.js','studio-shortcuts-v0617.js'}
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
 if manifest['version']!='0.6.18':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('image-layer-ops-v0618.js','image-studio-v0618.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-copy-layer',b'image-paste-layer',b'image-layer-opacity',b'data-layer-preset="glow"'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'function copySelectedLayer(',b'function pasteCopiedLayer(',b'clone:!!event.altKey',b'layerOps.translate(source,ox,oy)'):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.18 — LAYER CLIPBOARD, ALT-CLONE & APPEARANCE

REQUIRES unpacked v0.6.17-shortcuts-alpha.1 (not standalone).

1. Back up your existing MangoShot extension directory with manifest.json.
2. Extract this overlay into the SAME directory, overwriting changed files.
3. Reload at chrome://extensions or edge://extensions (Firefox about:debugging).
4. IMAGE STUDIO: select a layer to Copy (Ctrl+C), Cut (Ctrl+X), Paste
   (Ctrl+V) or Duplicate. This is an internal, session-only editable layer
   clipboard; Copy Image still exports annotated PNG to the OS clipboard.
5. Choose Select, then ALT+DRAG an unlocked object to clone and move it in
   one gesture. Works on imported images, text, vector and drawn strokes.
6. Normal drag moves a selected layer. Arrow keys nudge 1 px, Shift+arrows
   nudge 10 px while a layer is selected. Shortcuts never hijack text input.
7. Drag the grip in the layer stack to reorder objects with Undo support.
8. Use selected-layer opacity, Shadow/Glow/Floating/Crisp effect presets,
   details for blur/color/offset and supported blend modes.
   Copy Style and Paste Style transfer appearance between unlocked layers.
9. Original screenshot remains preserved. Layer appearance effects do not
   apply to eraser operations or redact annotations.
10. Existing Full Page Capture, Wacom pressure, Clip Studio and export
    features are left untouched by this overlay.

ROLLBACK: restore backed-up v0.6.17 extension folder and reload.
Do not uninstall or clear extension storage containing recordings.
No new browser permissions, cloud sync or external assets.
Run in-browser editor acceptance tests before promotion to stable.
'''
 header={'release':'v0.6.18 editable layer clipboard and styles alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.18','install_at':'unpacked extension root holding manifest.json',
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
