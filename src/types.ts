/**
 * Configuration types for CRD schema sync
 */

export interface CRDSource {
  /** Unique identifier for the source */
  id: string;
  /** Display name */
  name: string;
  /** URL to fetch CRDs from (supports YAML or raw manifests) */
  url: string;
  /** Organization/group name in CRDs catalog (e.g., "configuration.konghq.com") */
  group: string;
  /** Whether this source is enabled by default */
  enabled?: boolean;
}

export interface SyncConfig {
  /** CRD sources to sync */
  sources: Array<CRDSource>;
  /** Target GitHub repository (owner/repo format) */
  targetRepo: string;
  /** Branch to create PRs against */
  targetBranch: string;
  /** GitHub personal access token (from env: GITHUB_TOKEN) */
  githubToken?: string;
  /** Whether to create PRs automatically */
  createPR: boolean;
  /** PR title template */
  prTitleTemplate: string;
  /** PR body template */
  prBodyTemplate: string;
  /** Dry run mode (don't actually create PRs) */
  dryRun: boolean;
  /** Output directory for generated schemas */
  outputDir: string;
  /** Verbose logging */
  verbose: boolean;
}

export interface ParsedCRD {
  /** CRD name (metadata.name) */
  name: string;
  /** API group */
  group: string;
  /** Kind name */
  kind: string;
  /** API version (e.g., "v1", "v1beta1") */
  version: string;
  /** OpenAPI v3 schema */
  openAPIV3Schema: Record<string, unknown>;
  /** Full CRD YAML for reference */
  rawYAML: string;
  /** Source this CRD came from */
  source: CRDSource;
}

export interface JSONSchema {
  /** Standard JSON schema properties */
  $schema: string;
  description?: string;
  type: string;
  properties?: Record<string, unknown>;
  required?: Array<string>;
  [key: string]: unknown;
}

export interface SyncResult {
  success: boolean;
  message: string;
  generatedSchemas: Array<ParsedCRD>;
  changedSchemas: Array<ParsedCRD>;
  prUrl?: string;
  errors: Array<string>;
}
