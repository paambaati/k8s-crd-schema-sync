# CRD Schema Sync

Automated tool for generating and syncing Kubernetes Custom Resource Definition (CRD) JSON schemas to public CRD catalogs like [`datreeio/CRDs-catalog`](https://github.com/datreeio/CRDs-catalog).

Supports both URL-based sources and direct Kubernetes cluster connectivity via `kubectl` config.

## Quick Start

### Prerequisites

- Bun >= 1.0.0
- GitHub personal access token (optional, for PR creation)
- `kubectl` configured and authenticated (optional, for cluster dump)

### Usage

#### Sub-Commands

The tool now supports three sub-commands for fine-grained control –

```bash
# Dump CRDs directly from a Kubernetes cluster
bun src/index.ts dump [context]

# Download CRDs from configured URL sources
bun src/index.ts download

# Publish schemas to a GitHub repository via PR
bun src/index.ts publish
```

#### Dump from Kubernetes Cluster

```bash
# Dump from current kubectl context
bun src/index.ts dump

# Dump from specific context
bun src/index.ts dump my-kube-context

# Verbose output
bun src/index.ts dump --verbose

# Dump to custom output directory
bun src/index.ts dump -o /tmp/schemas
```

**How this works**
- Reads kubeconfig from `$KUBECONFIG` or `~/.kube/config`.
- Uses the current context unless specified.
- Directly calls Kubernetes API to fetch all CRDs.
- No external dependencies (kubectl CLI not required).

#### Download from Sources

```bash
# Download from configured sources
bun src/index.ts download

# With verbose output
bun src/index.ts download --verbose

# Download to custom output directory
bun src/index.ts download -o /tmp/schemas
```

#### Publish to GitHub

```bash
# Create PR with changes (requires GITHUB_TOKEN)
bun src/index.ts publish

# Dry run (shows what would be published)
bun src/index.ts publish --dry-run

# With custom target repo and branch
bun src/index.ts publish -t owner/repo -b main
```

#### GitHub Actions

The included GitHub Actions workflow runs on –
- **Schedule** – Weekly (Monday at 00:00 UTC).
- **Manual** – Via `workflow_dispatch`.

## Configuration

Configuration is loaded with the following precedence (lowest to highest) –
1. **Defaults** - Built-in defaults.
2. **Environment Variables** - `CRD_SYNC_*` variables.
3. **CLI Flags** - Command-line arguments override everything.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRD_SYNC_DRY_RUN` | `false` | Dry run mode (don't create PR) |
| `CRD_SYNC_VERBOSE` | `false` | Verbose logging |
| `CRD_SYNC_OUTPUT_DIR` | `./schemas` | Output directory for schemas |
| `CRD_SYNC_TARGET_REPO` | `datreeio/CRDs-catalog` | Target GitHub repo |
| `CRD_SYNC_TARGET_BRANCH` | `main` | Target branch |
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
