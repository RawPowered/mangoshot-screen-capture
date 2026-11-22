#!/usr/bin/env python3
"""Build deterministic distributable MangoShot browser extension archives."""
import argparse,hashlib,json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
BASE=Path(__file__).resolve().parent.parent
FIXED_DATE=(2026,1,1,0,0,0)

def build(out,release_tag):
    manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
    version=manifest['version']
    if release_tag.split('-')[0]!=f'v{version}':raise ValueError('Tag/version mismatch')
    out.mkdir(parents=True,exist_ok=True)
    files=sorted(set(p for ext in ('*.js','*.css','*.html','manifest.json') for p in BASE.glob(ext) if p.is_file()) |
                 set(p for p in (BASE/'icons').glob('*.png') if p.is_file()))
    required=['manifest.json','popup.html','capture-store.js','content.js','background.js','editor.js','recorder.js','clip-studio.js','pdf-export.js']
    for name in required:
        if name not in {p.name for p in files}:raise ValueError(f'Missing required extension file: {name}')
    target=out/f'MangoShot-{release_tag}-Extension.zip'
    with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
        for file in files:
            info=ZipInfo(file.relative_to(BASE).as_posix(),date_time=FIXED_DATE)
            info.compress_type=ZIP_DEFLATED
            info.external_attr=(0o644<<16)
            z.writestr(info,file.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
    with ZipFile(target) as z:
        if z.testzip() is not None:raise ValueError('Corrupt extension ZIP')
        actual=json.loads(z.read('manifest.json'))
        if actual['version']!=version:raise ValueError('Invalid archive manifest')
        for html in ('popup.html','editor.html'):
            if b'capture-store.js' not in z.read(html):raise ValueError(f'Capture library missing from {html}')
    print(f'OK {target.name}: {len(files)} files; SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
    return target
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist');parser.add_argument('--version',required=True)
    args=parser.parse_args();build(Path(args.out).resolve(),args.version)
