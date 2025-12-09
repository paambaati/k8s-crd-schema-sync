# CRD Schema Sync

Automated tool for generating and syncing Kubernetes Custom Resource Definition (CRD) JSON schemas to public CRD catalogs like [`datreeio/CRDs-catalog`](https://github.com/datreeio/CRDs-catalog).

## Quick Start

### Prerequisites

- Bun >= 1.0.0
- GitHub personal access token (optional, for PR creation)

### Usage

#### Local Sync (Generate schemas locally)

```bash
# Generate schemas locally.
bun src/index.ts

# With verbose output.
bun src/index.ts --verbose

# Custom output directory.
bun src/index.ts --output-dir /tmp/schemas

# Dry run with PR creation.
bun src/index.ts --create-pr --dry-run

# Print all available options.
bun src/index.ts --help
```

#### GitHub Actions

The included GitHub Actions workflow runs on –
- **Schedule**: Weekly (Monday at 00:00 UTC).
- **Manual**: Via `workflow_dispatch`.

## Configuration

Configuration is loaded with the following precedence (lowest to highest):
1. **Defaults** - Built-in defaults
2. **Environment Variables** - `CRD_SYNC_*` variables
3. **CLI Flags** - Command-line arguments override everything

### CLI Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--verbose` | | Enable verbose (debug) logging |
| `--dry-run` | `-d` | Dry run mode (don't create PR) |
| `--create-pr` | `-c` | Create PR on target repository |
| `--output-dir <path>` | `-o <path>` | Output directory for schemas |
| `--target-repo <repo>` | `-t <repo>` | Target GitHub repository |
| `--target-branch <name>` | `-b <name>` | Target branch |
| `--help` | `-h` | Display help message |
| `--version` | `-v` | Display version number |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRD_SYNC_CREATE_PR` | `false` | Create PR on `CRD_SYNC_TARGET_REPO` |
| `CRD_SYNC_DRY_RUN` | `false` | Dry run mode (don't create PR) |
| `CRD_SYNC_VERBOSE` | `false` | Verbose logging |
| `CRD_SYNC_OUTPUT_DIR` | `./schemas` | Output directory for schemas |
| `CRD_SYNC_TARGET_REPO` | `datreeio/CRDs-catalog` | Target GitHub repo |
| `CRD_SYNC_TARGET_BRANCH` | `main` | Target branch |
| `GITHUB_TOKEN` | - | GitHub PAT (required for PR creation) |

### Adding CRD Sources

Edit `src/config.ts` to add new sources:

```typescript
const DEFAULT_SOURCES: Array<CRDSource> = [
  {
    id: "kong",
    name: "Kong Ingress Controller",
    url: "https://raw.githubusercontent.com/Kong/charts/main/charts/kong/crds/custom-resource-definitions.yaml",
    group: "configuration.konghq.com",
    enabled: true,
  },
  // <-- Add more sources here
];
```

3. Commit and the workflow will automatically sync on next run

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
