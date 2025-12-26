# `k8s` CRD Schema Sync (`kcss`)

Automated tool for generating and syncing Kubernetes Custom Resource Definition (CRD) JSON schemas to public CRD catalogs like [`datreeio/CRDs-catalog`](https://github.com/datreeio/CRDs-catalog).

Supports both URL-based sources and direct Kubernetes cluster connectivity via `kubectl` config.

## Quick Start

### Prerequisites

- GitHub personal access token (optional, for PR creation)
- `kubectl` configured and authenticated (optional, for cluster dump)

### Install

#### Download Prebuilt Binary

Download the appropriate binary for your system from the [releases page](https://github.com/paambaati/k8s-crd-schema-sync/releases).

Then make it executable and rename it –

```bash
chmod +x kcss-linux-x64
mv kcss-linux-x64 kcss
sudo mv kcss /usr/local/bin/  # Optional – move to $PATH.
```

#### Build from Source

If you have [Bun](https://bun.sh/) installed –

```bash
git clone https://github.com/paambaati/k8s-crd-schema-sync.git
cd k8s-crd-schema-sync
bun install
bun run build  # or 'bun run build:all' for all platforms
```

### Usage

#### Sub-Commands

The tool now supports three sub-commands for fine-grained control –

```bash
# Dump CRDs directly from a Kubernetes cluster
kcss dump [context]

# Download CRDs from configured URL sources
kcss download

# Publish schemas to a GitHub repository via PR
kcss publish
```

#### Dump from Kubernetes Cluster

```bash
# Dump from current kubectl context
kcss dump

# Dump from specific context
kcss dump my-kube-context

# Verbose output
kcss dump --verbose

# Dump to custom output directory
kcss dump -o /tmp/schemas
```

**How this works**
- Reads kubeconfig from `$KUBECONFIG` or `~/.kube/config`.
- Uses the current context unless specified.
- Directly calls Kubernetes API to fetch all CRDs.
- No external dependencies (`kubectl` CLI not required).

#### Download from Sources

```bash
# Download from configured sources
kcss download

# With verbose output
kcss download --verbose

# Download to custom output directory
kcss download -o /tmp/schemas
```

#### Publish to GitHub

```bash
# Create PR with changes (requires GITHUB_TOKEN)
kcss publish

# Dry run (shows what would be published)
kcss publish --dry-run

# With custom target repo and branch
kcss publish -t owner/repo -b main
```

## Configuration

Configuration is loaded with the following precedence (lowest to highest) –
1. **Defaults** - Built-in defaults.
2. **Environment Variables** - `KCSS_*` variables.
3. **CLI Flags** - Command-line arguments override everything.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KCSS_DRY_RUN` | `false` | Dry run mode (don't create PR) |
| `KCSS_VERBOSE` | `false` | Verbose logging |
| `KCSS_WORK_DIR` | `./schemas` | Output directory for schemas |
| `KCSS_TARGET_REPO` | `datreeio/CRDs-catalog` | Target GitHub repo |
| `KCSS_TARGET_BRANCH` | `main` | Target branch |
| `GITHUB_TOKEN` | - | GitHub PAT (required for PR creation) |
| `KUBECONFIG` | `~/.kube/config` | Kubeconfig file path (for cluster dump) |

### Adding CRD Download Sources

Edit `src/config.ts` to add new URL-based sources –

```typescript
const DEFAULT_SOURCES: Array<URLCRDSource> = [
  {
    type: "url",
    id: "kong",
    name: "Kong Ingress Controller",
    url: "https://raw.githubusercontent.com/Kong/charts/main/charts/kong/crds/custom-resource-definitions.yaml",
    group: "configuration.konghq.com",
    enabled: true,
  },
  // <-- Add more URL sources here
];
```

## Contributing

Contributions welcome! Please –

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run `bun run lint && bun run format`.
5. Submit a pull request.

## See Also

- [datreeio/CRDs-catalog](https://github.com/datreeio/CRDs-catalog) - Target repository.
- [Kubernetes OpenAPI](https://kubernetes.io/docs/concepts/overview/working-with-objects/) - OpenAPI spec.
- [JSON Schema](https://json-schema.org/) - JSON Schema format.
- [Kubeconfig Format](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) - Kubernetes authentication config.
