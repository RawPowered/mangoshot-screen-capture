# Contributing to MangoShot

MangoShot is publicly readable and free to use under the [MangoShot Community Source-Available License 1.0](LICENSE), but is **not OSI-approved open-source software**. Resale and paid software distribution require separate written permission.

## Issues, bug reports and suggestions

Please open a [GitHub Issue](https://github.com/RawPowered/mangoshot-screen-capture/issues) with a reproducible scenario, MangoShot version or tag, browser and version, operating system, whether Wacom/tablet input is involved, and expected versus actual behavior. Redact sensitive screenshots, recordings, URLs, authentication details and customer information before sharing.

## Code contributions and copyright

RawPowered reserves the ability to develop future commercial, dual-licensed and closed-source versions. To maintain those rights **for external contributions**, the project must verify contributor permissions before merging code.

- You may open an issue or discuss a proposed change without signing anything.
- Before a pull request can be accepted, the maintainer may require a separate written **Contributor License Agreement (CLA)** granting RawPowered permission to use and relicense that contribution, including in commercial and proprietary products.
- A pull request or public GitHub contribution **does not automatically transfer copyright** or confer unrestricted relicensing rights.
- Do not submit third-party code, artwork, fonts, audio, trademarks, or material you lack permission to contribute.
- Documentation corrections and patches should cite the source and applicable third-party license when relevant.
- Contributions remain subject to review, security testing, and project compatibility checks; there is no obligation to merge them.

If you are not prepared to grant the necessary rights, please submit a description or issue instead of code. A separate agreement, if required, will be provided by the copyright owner; this file itself is not a signed assignment or CLA.

## Development checks

Work from the tagged source for the intended release, not an assumed up-to-date main branch. Follow the current README for unpacked extension installation.

Run all repository checks before proposing a patch:

```sh
for test in tests/*.cjs; do node "$test"; done
```

When a patch changes browser behavior, also test its corresponding Image Studio, Record Studio and/or Clip Studio workflow in the actual browser, including Undo/Redo, copy/export, local storage retention and relevant accessibility controls.

## Responsible disclosure

For security defects affecting recordings, clipboard, capture permissions, or user data, avoid posting sensitive reproduction material or private sample assets in public issues. Contact the repository maintainer privately through the available GitHub contact channels before disclosing exploit details.

## Disclaimer

The contributor policy and custom license are project-owner terms, not a substitute for advice from qualified legal counsel.
