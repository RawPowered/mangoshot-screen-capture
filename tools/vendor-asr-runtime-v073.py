#!/usr/bin/env python3
"""Copy prebuilt, locally executed Transformer/ONNX runtime into extension ZIP.

Only model *weights* may be fetched after explicit user consent.
The executable JS, WASM and WASM loader code are always vendored and must
never be imported from a CDN in an MV3 extension.
"""
from pathlib import Path
import hashlib, json, shutil
ROOT=Path(__file__).resolve().parent.parent
PKG=ROOT/'node_modules'/'@huggingface'/'transformers'
DIST=PKG/'dist'
TARGET=ROOT/'asr-runtime'
ENTRY=DIST/'transformers.web.min.js'
if not ENTRY.is_file():
    raise SystemExit('Pinned Transformers.js web bundle is missing: '+str(ENTRY))
if TARGET.exists():
    shutil.rmtree(TARGET)
TARGET.mkdir(parents=True)
copied=[]
for source in [ENTRY,*DIST.glob('ort-wasm*.wasm'),*DIST.glob('ort-wasm*.mjs')]:
    if not source.is_file():continue
    path=TARGET/source.name
    shutil.copyfile(source,path);copied.append(path)
# The NPM distribution's web runtime contains its own ONNX .wasm loader
# sidecars. Do not silently fetch an executable sidecar from jsDelivr.
assert (TARGET/'transformers.web.min.js').exists()
assert any(p.suffix=='.wasm' for p in copied),'No ONNX WASM file shipped'
assert any(p.suffix=='.mjs' for p in copied),'No local ONNX WASM loader shipped'
# Bundle a third-party license notice; do not remove attribution.
licenses=[]
for pkg in (PKG,ROOT/'node_modules'/'onnxruntime-web',ROOT/'node_modules'/'onnxruntime-common'):
    if pkg.exists():
        for stem in ('LICENSE','LICENSE.txt','LICENSE.md'):
            f=pkg/stem
            if f.exists():
                licenses.append('== '+str(pkg.relative_to(ROOT))+' ==\n'+f.read_text(errors='replace'))
                break
(TARGET/'THIRD-PARTY-LICENSES.txt').write_text('\n\n'.join(licenses),encoding='utf-8')
if not licenses:raise SystemExit('Cannot package unlicensed third-party runtime')
fingerprint={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in copied}
(TARGET/'RUNTIME-SHA256.json').write_text(json.dumps(fingerprint,indent=2)+'\n')
print('Vendored local ASR runtime files:',len(copied),'total MiB',
      round(sum(p.stat().st_size for p in copied)/1048576,2))
