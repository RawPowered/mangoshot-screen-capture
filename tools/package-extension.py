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
                 set(p for p in (BASE/'icons').glob('*.png') if p.is_file()) |
                 set(p for p in (BASE/'assets').glob('*.webp') if p.is_file()))
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
        if version in ('0.6.9','0.6.10','0.6.11','0.6.12'):
            for icon in ('16','32','48','128'):
                if not z.read(f'icons/icon-{icon}.png').startswith(b'\x89PNG\r\n\x1a\n'):
                    raise ValueError(f'Brand icon-{icon} must be PNG')
            for asset in ('mangoshot-wordmark.webp','mangoshot-icon.webp'):
                data=z.read('assets/'+asset)
                if not (data.startswith(b'RIFF') and data[8:12]==b'WEBP'):
                    raise ValueError(f'Brand asset missing or invalid: {asset}')
            if version in ('0.6.11','0.6.12'):
                editor=z.read('editor.html')
                for dep in (b'image-editor-core-v0611.js',b'image-studio-v0611.css',b'image-context-menu',b'text-inline-input'):
                    if dep not in editor:raise ValueError('Image Studio UI missing '+dep.decode())
                if b'ClipboardItem' not in z.read('editor.js'):
                    raise ValueError('Clipboard image write implementation missing')
                if version == '0.6.12':
                    for dep in (b'image-layers-v0612.js',b'image-studio-v0612.css',b'image-panel-layers',b'image-panel-type',b'image-panel-mask',b'image-import-file'):
                        if dep not in editor:raise ValueError('Layer Studio dependency missing '+dep.decode())
                    for dep in ('image-layers-v0612.js','image-studio-v0612.css'):
                        if dep not in z.namelist():raise ValueError('Layer Studio file missing '+dep)
            if b'<iframe' in z.read('resources.html').lower():
                raise ValueError('Resource directory must not embed provider frames')
    print(f'OK {target.name}: {len(files)} files; SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
    return target
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist');parser.add_argument('--version',required=True)
    args=parser.parse_args();build(Path(args.out).resolve(),args.version)
