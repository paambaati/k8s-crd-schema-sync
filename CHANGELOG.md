# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1](https://github.com/paambaati/k8s-crd-schema-sync/compare/k8s-crd-schema-sync-v0.2.0...k8s-crd-schema-sync-v0.2.1) (2025-12-12)


### Bug Fixes

* **ci/cd:** redesign the confusing workflows ([6aa75d2](https://github.com/paambaati/k8s-crd-schema-sync/commit/6aa75d21b02e5a8b83365b95b28172bf2a092823))

## [0.2.0](https://github.com/paambaati/k8s-crd-schema-sync/compare/k8s-crd-schema-sync-v0.1.0...k8s-crd-schema-sync-v0.2.0) (2025-12-12)


### Features

* add PR URL to Action run summary ([a6abb76](https://github.com/paambaati/k8s-crd-schema-sync/commit/a6abb76be40b39679b0fad69cc179dd8a7e9b9ba))
* auto-release + publish binaries to releases ([d80ca8e](https://github.com/paambaati/k8s-crd-schema-sync/commit/d80ca8ef1d1a2962f89222bc508ec6a8120777a4))
* better types ([25c5bc1](https://github.com/paambaati/k8s-crd-schema-sync/commit/25c5bc175aeaddce75a54517dbd8b9e8cfe99842))
* **ci:** allow customizing target repo in workflow ([1f81dd5](https://github.com/paambaati/k8s-crd-schema-sync/commit/1f81dd590674370bd39d341453352bbce748ed7e))
* dump CRDs from `k8s` cluster ([#1](https://github.com/paambaati/k8s-crd-schema-sync/issues/1)) ([9574b43](https://github.com/paambaati/k8s-crd-schema-sync/commit/9574b43e383743e510ca24c45dec7d256f8c2c43))
* initial release ([8bb5516](https://github.com/paambaati/k8s-crd-schema-sync/commit/8bb5516669f77646ef5a0235fce5db0c8b57f8bc))
* publish binaries and set up release process ([#2](https://github.com/paambaati/k8s-crd-schema-sync/issues/2)) ([3dae569](https://github.com/paambaati/k8s-crd-schema-sync/commit/3dae569e1462c93ac89b7985325a04a15893d91c))
* support downloading CRDs from k8s cluster ([24b10fd](https://github.com/paambaati/k8s-crd-schema-sync/commit/24b10fd56387c22426534a6a15e89aeb3ec86a28))


### Bug Fixes

* **ci/cd:** remove invalid plugin ([bfb448b](https://github.com/paambaati/k8s-crd-schema-sync/commit/bfb448bfca64fe82adcf6c989e2b629002da3a27))
* **ci/cd:** remove invalid plugin config ([89a0446](https://github.com/paambaati/k8s-crd-schema-sync/commit/89a044628a87799c4e3af23e1edac491a9f5e0ed))
* **ci:** better defaults for sync ([42d8d6f](https://github.com/paambaati/k8s-crd-schema-sync/commit/42d8d6fbf1260c9b72e729ee62508ee9a93eb76d))
* **ci:** fix paths ([d77e0ee](https://github.com/paambaati/k8s-crd-schema-sync/commit/d77e0ee3221d0162678665d7a41cecaa9cd51540))
* **ci:** remove legacy flag from workflow config ([9a8dbd3](https://github.com/paambaati/k8s-crd-schema-sync/commit/9a8dbd3920bec724324c94054db8e07691c6827b))
* **ci:** update workflow to use the new sub-commands ([1aa5eb4](https://github.com/paambaati/k8s-crd-schema-sync/commit/1aa5eb47e6f0d1faa8c8ca2cfed4ebb729dfef76))
* **ci:** use my personal fork to push changes ([68436ba](https://github.com/paambaati/k8s-crd-schema-sync/commit/68436ba7aef5024aebcfc8fb27a55f11272acf19))
* **ci:** use the correct flags ([d77b69a](https://github.com/paambaati/k8s-crd-schema-sync/commit/d77b69a5734b9e7ceb4ece04093ac67bc424fa7d))
* **core:** rebuild the file naming logic from datreeio's CRD extractor tool ([cefcca1](https://github.com/paambaati/k8s-crd-schema-sync/commit/cefcca163aefec6ed98d9f896b5599d6a6ee0f45))
* **core:** set up correct schema file structure ([02d16e4](https://github.com/paambaati/k8s-crd-schema-sync/commit/02d16e4a33d0cfd1269b7b072d8e1e23457f2c32))
* more fixes for alignment with CRD extractor Python script ([e7d3e92](https://github.com/paambaati/k8s-crd-schema-sync/commit/e7d3e92e5821b2ba403db63776bee6c16cb74ab0))
* strict no additional properties by default if unspecified ([050f0ca](https://github.com/paambaati/k8s-crd-schema-sync/commit/050f0caf51487bfa50e06f75bf9b918c6ca41f2a))

## [Unreleased]

### Added
- Initial project setup with conventional commits support
- Release automation with release-please
- Automated binary builds for Linux (x64, arm64, musl variants)

[unreleased]: https://github.com/paambaati/k8s-crd-schema-sync/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/paambaati/k8s-crd-schema-sync/releases/tag/v0.1.0
