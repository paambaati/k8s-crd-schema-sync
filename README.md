# CRD Schema Sync

Automated tool for generating and syncing Kubernetes Custom Resource Definition (CRD) JSON schemas to public CRD catalogs like [`datreeio/CRDs-catalog`](https://github.com/datreeio/CRDs-catalog).

Supports both URL-based sources and direct Kubernetes cluster connectivity via kubectl config.

## Quick Start

### Prerequisites

- Bun >= 1.0.0
- GitHub personal access token (optional, for PR creation)
- `kubectl` configured and authenticated (optional, for cluster dump)

### Usage

#### Sub-Commands

The tool now supports three sub-commands for fine-grained control:

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
bun src/index.ts dump my-cluster-context

# Verbose output
bun src/index.ts dump --verbose

# Custom output directory
bun src/index.ts dump -o /tmp/schemas
```

**How it works:**
- Reads kubeconfig from `$KUBECONFIG` or `~/.kube/config`
- Uses the current context unless specified
- Directly calls Kubernetes API to fetch all CRDs
- No external dependencies (kubectl CLI not required)

#### Download from Sources

```bash
# Download from configured sources
bun src/index.ts download

# With verbose output
bun src/index.ts download --verbose

# Custom output directory
bun src/index.ts download -o /tmp/schemas
```

#### Publish to GitHub

```bash
# Create PR with changes (requires GITHUB_TOKEN)
bun src/index.ts publish --create-pr

# Dry run (shows what would be published)
bun src/index.ts publish --create-pr --dry-run

# With custom target repo and branch
bun src/index.ts publish --create-pr -t owner/repo -b main
```

#### Legacy Default Behavior

```bash
# Download and optionally publish in one command
bun src/index.ts

# With verbose output
bun src/index.ts --verbose

# Custom output directory
bun src/index.ts --output-dir /tmp/schemas

# Dry run with PR creation
bun src/index.ts --create-pr --dry-run

# Print all available options
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
| `KUBECONFIG` | `~/.kube/config` | Kubeconfig file path (for cluster dump) |

### Adding CRD Sources

Edit `src/config.ts` to add new URL-based sources:

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

### Kubernetes Cluster Sources

For cluster-based sources, the tool supports both inline configuration and kubeconfig-based discovery:

```typescript
// In config or via API
const clusterSource: K8sClusterCRDSource = {
  type: "k8s-cluster",
  id: "my-cluster",
  name: "My Production Cluster",
  context: "prod-context",        // Optional: uses current-context if not specified
  namespace: "cert-manager",      // Optional: filter by namespace
  apiServerUrl: "https://...",    // Optional: override kubeconfig URL
  caPath: "/path/to/ca.crt",      // Optional: override kubeconfig CA
  enabled: true,
};
```

The client automatically:
- Loads kubeconfig from `$KUBECONFIG` or `~/.kube/config`
- Extracts authentication credentials (tokens, client certs, CA certs)
- Handles embedded certificates and private keys in kubeconfig
- Uses direct Kubernetes API calls (no kubectl CLI dependency)

## Architecture

### Components

- **`types.ts`** - Discriminated union types for URL and Kubernetes cluster sources
- **`config.ts`** - Configuration management and CLI parsing
- **`crd-parser.ts`** - Handles both URL and cluster-based CRD fetching
- **`k8s-client.ts`** - Lightweight Kubernetes client for kubeconfig parsing and API calls
- **`file-operations.ts`** - File I/O for schemas
- **`github-manager.ts`** - GitHub API integration for PR creation
- **`logger.ts`** - Logging infrastructure
- **`index.ts`** - Main orchestrator with sub-command routing
- **`utils.ts`** - Utility functions (path expansion, etc.)

### Design Principles

- **Battle-tested** - Uses standard Kubernetes client patterns
- **Lightweight** - No external k8s client library; uses native Bun fetch
- **Fast** - Direct API calls instead of subprocess kubectl invocation
- **Robust** - Comprehensive kubeconfig parsing with embedded credential support
- **Flexible** - Type-safe discriminated unions for sources
- **Type-safe** - Full TypeScript with `Array<>` notation throughout

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
