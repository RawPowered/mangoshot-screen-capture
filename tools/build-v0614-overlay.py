#!/usr/bin/env python3
"""MangoShot v0.6.14 strict quick-copy, selected area and live text overlay from v0.6.13."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
ROOT=Path(__file__).resolve().parents[1]
BASE='v0.6.13-typefx-alpha.1'
NAME='MangoShot-v0.6.14-quick-copy-live-text-overlay-from-v0.6.13.zip'
FILES={'popup.html','popup.js','popup-v0614.css','background.js','selection-v0614.js',
       'capture-output-v0614.js','capture-result.html','capture-result-v0614.js',
       'capture-result-v0614.css','editor.html','editor.js','image-studio-v0614.css',
       'manifest.json'}
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
 if manifest['version']!='0.6.14':raise RuntimeError('Wrong version')
 html=data['editor.html']
 for asset in ('capture-output-v0614.js','image-studio-v0614.css'):
  if asset.encode() not in html:raise RuntimeError('Image Editor dependency missing: '+asset)
 for marker in (b'image-clipboard-landing',b'clipboard-paste-zone',b'clipboard-read',b'clipboard-import'):
  if marker not in html:raise RuntimeError('Image Studio UI contract missing')
 js=data['editor.js']
 for marker in (b'ClipboardItem',b'copyImage(',b'draftTextLayer(',b'loadClipboardImage(',b'textTyping=',b'fxGestures='):
  if marker not in js:raise RuntimeError('Editor behavior missing')
 readme='''# MangoShot v0.6.14 — QUICK COPY, AREA CAPTURE, LIVE TEXT OVERLAY

REQUIRES unpacked v0.6.13-typefx-alpha.1 installation; not standalone.

1. Back up your entire extension root containing manifest.json and important captures.
2. Extract the ZIP over the SAME root and overwrite matching files.
3. Reload the unpacked extension at edge://extensions or chrome://extensions;
   Firefox temporary extension: about:debugging.
4. Toolbar > Copy visible / Copy full page / Copy selection (drag rectangle).
   The capture result page attempts to automatically write the original-quality
   PNG to your clipboard using clipboardWrite; if blocked, click Copy screenshot.
5. Toolbar > Edit clipboard image opens Image Studio without an initial capture.
   Click Paste image, press Ctrl+V or choose an image file.
   Only PNG/JPEG/WebP are accepted, on a user action; no silent clipboard reads.
6. Image Studio > Text: click and type. The canvas renders live before Place.
   Inspector text and effect sliders also update live; one Undo per gesture.
   Escape cancels the live inline draft without changing the committed text.
7. Screenshot, annotations, recorder and video editor continue to work locally.
   No data is transferred to any server.

ROLLBACK: restore your backed-up v0.6.13 extension root and reload. Do not
uninstall/clear browser extension storage holding locally stored recordings.
Browser clipboard permission prompts may appear on upgrade, since this patch
adds clipboardWrite. There is NO clipboardRead permission requested.
Chrome/Edge/Firefox real-browser acceptance remains required before stable.
'''
 header={'release':'v0.6.14 quick copy live text alpha 1','baseline_tag':BASE,'baseline_sha':base,
 'target_sha':head,'version':'0.6.14','install_at':'unpacked extension root holding manifest.json',
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
