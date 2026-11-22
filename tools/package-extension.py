#!/usr/bin/env python3
"""Build a reproducible unpacked MangoShot extension ZIP from a repository checkout.

Does not package tests, local captures, secrets, or developer utilities.
"""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

BASE = Path(__file__).resolve().parent.parent
FIXED_DATE = (2026, 1, 1, 0, 0, 0)


def build(output_dir: Path, release_tag: str) -> Path:
    manifest = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    if release_tag.split('-')[0] != f'v{version}':
        raise ValueError('Release tag does not match manifest version')
    output_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(set(
        p for extension in ('*.js', '*.css', '*.html', 'manifest.json')
        for p in BASE.glob(extension) if p.is_file()
    ) | set(p for p in (BASE / 'icons').glob('*.png') if p.is_file()))
    if len(files) < 20 or not any(p.name == 'manifest.json' for p in files):
        raise ValueError('Unexpected extension source file set')
    for missing in ['background.js', 'popup.html', 'recorder.html', 'editor.html', 'clip-studio.html']:
        if not (BASE / missing).exists():
            raise ValueError(f'Missing required entrypoint: {missing}')
    destination = output_dir / f'MangoShot-{release_tag}-Extension.zip'
    with ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for file in files:
            info = ZipInfo(file.relative_to(BASE).as_posix(), date_time=FIXED_DATE)
            info.compress_type = ZIP_DEFLATED
            info.external_attr = (0o644 << 16)
            archive.writestr(info, file.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    with ZipFile(destination) as check:
        if check.testzip() is not None:
            raise ValueError('Corrupt extension archive')
        if json.loads(check.read('manifest.json'))['version'] != version:
            raise ValueError('Manifest version mismatch in archive')
    print(f'{destination} ({len(files)} files; SHA256 {hashlib.sha256(destination.read_bytes()).hexdigest()})')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='dist')
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    build(Path(args.out).resolve(), args.version)
