/**
 * Configuration types for CRD schema sync
 */

/** URL-based CRD source */
export interface URLCRDSource {
  type: 'url';
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

/** Kubernetes cluster CRD source */
export interface K8sClusterCRDSource {
  type: 'k8s-cluster';
  /** Unique identifier for the source */
  id: string;
  /** Display name */
  name: string;
  /** Kubernetes cluster context name (uses current-context from kubeconfig if not specified) */
  context?: string;
  /** Kubernetes namespace filter (if empty, all namespaces) */
  namespace?: string;
  /** Optional API server URL (overrides kubeconfig) */
  apiServerUrl?: string;
  /** Optional certificate authority path for TLS verification */
  caPath?: string;
  /** Whether this source is enabled by default */
  enabled?: boolean;
}

/** CRD source - either URL or Kubernetes cluster */
export type CRDSource = URLCRDSource | K8sClusterCRDSource;

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
  /** Directory where schemas are saved */
  workDir: string;
  /** Verbose logging */
  verbose: boolean;
}

export interface ParsedCRD {
  /** CRD name (metadata.name) */
  name: string;
  /** Plural resource name extracted from metadata.name (e.g., "kongconsumers" from "kongconsumers.configuration.konghq.com") */
  pluralName: string;
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

export interface K8sCRDSpec {
  group: string;
  names: {
    kind: string;
    singular?: string;
    plural?: string;
  };
  versions: Array<{
    name: string;
    schema?: {
      openAPIV3Schema?: Record<string, unknown>;
    };
    served?: boolean;
    storage?: boolean;
  }>;
}

export interface K8sCRD {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  spec: K8sCRDSpec;
}

export interface KubeConfig {
  clusters: Array<{
    name: string;
    cluster: {
      server: string;
      'certificate-authority'?: string;
      'certificate-authority-data'?: string;
      'insecure-skip-tls-verify'?: boolean;
    };
  }>;
  contexts: Array<{
    name: string;
    context: {
      cluster: string;
      user: string;
      namespace?: string;
    };
  }>;
  'current-context': string;
  users: Array<{
    name: string;
    user: {
      'client-certificate'?: string;
      'client-certificate-data'?: string;
      'client-key'?: string;
      'client-key-data'?: string;
      token?: string;
      'auth-provider'?: Record<string, unknown>;
      exec?: Record<string, unknown>;
    };
  }>;
}

export interface K8sAuthConfig {
  serverUrl: string;
  token?: string;
  cert?: string;
  key?: string;
  caPath?: string;
  skipTlsVerify?: boolean;
}

export interface K8sCRDList {
  apiVersion: string;
  kind: string;
  items: Array<{
    apiVersion: string;
    kind: string;
    metadata: {
      name: string;
      annotations?: Record<string, string>;
      labels?: Record<string, string>;
    };
    spec: {
      group: string;
      names: {
        kind: string;
        singular?: string;
        plural?: string;
      };
      versions: Array<{
        name: string;
        schema?: {
          openAPIV3Schema?: Record<string, unknown>;
        };
        served?: boolean;
        storage?: boolean;
      }>;
    };
  }>;
}

export interface JSONSchema {
  /** Standard JSON schema properties */
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
