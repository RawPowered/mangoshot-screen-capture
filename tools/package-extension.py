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
        if version in ('0.6.9','0.6.10','0.6.11','0.6.12','0.6.13','0.6.14','0.6.15','0.6.16','0.6.17'):
            for icon in ('16','32','48','128'):
                if not z.read(f'icons/icon-{icon}.png').startswith(b'\x89PNG\r\n\x1a\n'):
                    raise ValueError(f'Brand icon-{icon} must be PNG')
            for asset in ('mangoshot-wordmark.webp','mangoshot-icon.webp'):
                data=z.read('assets/'+asset)
                if not (data.startswith(b'RIFF') and data[8:12]==b'WEBP'):
                    raise ValueError(f'Brand asset missing or invalid: {asset}')
            if version in ('0.6.11','0.6.12','0.6.13','0.6.14','0.6.15','0.6.16','0.6.17'):
                editor=z.read('editor.html')
                for dep in (b'image-editor-core-v0611.js',b'image-studio-v0611.css',b'image-context-menu',b'text-inline-input'):
                    if dep not in editor:raise ValueError('Image Studio UI missing '+dep.decode())
                if b'ClipboardItem' not in z.read('editor.js'):
                    raise ValueError('Clipboard image write implementation missing')
                if version in ('0.6.12','0.6.13','0.6.14','0.6.15','0.6.16','0.6.17'):
                    for dep in (b'image-layers-v0612.js',b'image-studio-v0612.css',b'image-panel-layers',b'image-panel-type',b'image-panel-mask',b'image-import-file'):
                        if dep not in editor:raise ValueError('Layer Studio dependency missing '+dep.decode())
                    for dep in ('image-layers-v0612.js','image-studio-v0612.css'):
                        if dep not in z.namelist():raise ValueError('Layer Studio file missing '+dep)
                    if version in ('0.6.13','0.6.14','0.6.15','0.6.16','0.6.17'):
                        for dep in (b'image-type-effects-v0613.js',b'image-studio-v0613.css',b'data-resize-handle',b'data-fx-group',b'image-keep-ratio'):
                            if dep not in editor:raise ValueError('v0.6.13 text FX / transform control missing '+dep.decode())
                        for dep in ('image-type-effects-v0613.js','image-studio-v0613.css'):
                            if dep not in z.namelist():raise ValueError('Image text FX file missing '+dep)
            if version in ('0.6.14','0.6.15','0.6.16','0.6.17'):
                if 'clipboardWrite' not in actual['permissions']:
                    raise ValueError('Quick Copy needs clipboardWrite permission')
                for dep in ('capture-output-v0614.js','selection-v0614.js',
                            'capture-result.html','capture-result-v0614.js',
                            'capture-result-v0614.css','popup-v0614.css','image-studio-v0614.css'):
                    if dep not in z.namelist():raise ValueError('Missing Quick Copy runtime '+dep)
                popup=z.read('popup.html')
                for marker in (b'id="visible"',b'id="area"',b'id="full"',b'id="clipboard-edit"'):
                    if marker not in popup:raise ValueError('Missing capture option '+marker.decode())
                result=z.read('capture-result.html')
                for dep in (b'capture-store.js',b'capture-output-v0614.js',
                            b'capture-result-v0614.js',b'qc-copy',b'qc-edit'):
                    if dep not in result:raise ValueError('Quick Copy staging incomplete')
                for dep in (b'capture-output-v0614.js',b'image-clipboard-landing',
                            b'clipboard-paste-zone',b'image-studio-v0614.css'):
                    if dep not in editor:raise ValueError('Clipboard import not wired')
            if version in ('0.6.15','0.6.16','0.6.17'):
                for dep in ('image-vector-v0615.js','image-studio-v0615.css','studio-v0615.css'):
                    if dep not in z.namelist():raise ValueError('Missing v0.6.15 editor asset '+dep)
                for dep in (b'image-vector-v0615.js',b'image-studio-v0615.css',
                            b'image-active-tool-name',b'image-vector-library',
                            b'image-shape-fill-enabled',b'vector-selection-box'):
                    if dep not in editor:raise ValueError('Image vector property inspector incomplete')
                clip=z.read('clip-studio.html')
                for dep in (b'studio-v0615.css',b'v0615-active-tool',b'data-v06-tool="tool-razor"'):
                    if dep not in clip:raise ValueError('Clip Studio active tool surface missing')
                if b'function topLayerAt(' not in z.read('editor.js'):
                    raise ValueError('Topmost image/vector selection not connected')
            if version in ('0.6.16','0.6.17'):
                for dep in ('pen-input-v0616.js','image-studio-v0616.css'):
                    if dep not in z.namelist():raise ValueError('Missing Wacom runtime '+dep)
                for dep in (b'pen-input-v0616.js',b'image-studio-v0616.css',
                            b'data-studio-tool="erase-brush"',b'data-studio-tool="erase-stroke"',
                            b'pen-test-pad',b'image-eraser-hardness',b'image-pen-pressure'):
                    if dep not in editor:raise ValueError('Wacom/eraser editor UI missing')
                for dep in (b'function eraseEntireAt(',b'penInput?.paintEraser?.(pen,stroke)',
                            b'penInput?.eraserTip?.(event)',b'penInput?.createDiagnostic?.('):
                    if dep not in z.read('editor.js'):raise ValueError('Wacom/eraser integration missing')
            if version == '0.6.17':
                for dep in ('shortcut-core-v0617.js','studio-shortcuts-v0617.js',
                            'studio-menus-v0617.js','studio-v0617.css'):
                    if dep not in z.namelist():raise ValueError('Missing Shortcut Studio asset '+dep)
                for page in ('editor.html','clip-studio.html'):
                    src=z.read(page)
                    for dep in (b'shortcut-core-v0617.js',b'studio-shortcuts-v0617.js',
                                b'studio-menus-v0617.js',b'studio-v0617.css',
                                b'studio-command-palette',b'data-studio-action="showShortcuts"'):
                        if dep not in src:raise ValueError('Shortcut or menu UI missing from '+page)
                    if src.index(b'studio-command-palette')>src.index(b'studio-shortcuts-v0617.js'):
                        raise ValueError('Command palette must be in DOM before script initialization')
                if b'globalThis.MangoImageActions={run:imageCommand' not in z.read('editor.js'):
                    raise ValueError('Shortcut actions not wired to Image Studio')
                if b'root.MangoShortcutsV0617?.active' not in z.read('keyboard-shortcuts-v065.js'):
                    raise ValueError('Legacy Clip shortcut listener can execute duplicate commands')
            if b'<iframe' in z.read('resources.html').lower():
                raise ValueError('Resource directory must not embed provider frames')
    print(f'OK {target.name}: {len(files)} files; SHA-256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
    return target
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--out',default='dist');parser.add_argument('--version',required=True)
    args=parser.parse_args();build(Path(args.out).resolve(),args.version)
