/**
 * Fetch and parse Kubernetes CRDs from remote sources
 * Uses Bun.fetch() for efficient HTTP requests
 */

import YAML from 'yaml';
import { getLogger } from './logger';
import type { CRDSource, ParsedCRD } from './types';

interface K8sCRDSpec {
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

interface K8sCRD {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
  };
  spec: K8sCRDSpec;
}

export async function fetchCRDs(source: CRDSource): Promise<Array<K8sCRD>> {
  try {
    const response = await Bun.fetch(source.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    const crds: Array<K8sCRD> = [];

    // Handle both single YAML and multi-document YAML.
    const documents = content.split(/^---$/m).filter((doc) => doc.trim().length > 0);

    for (const doc of documents) {
      try {
        const parsed = YAML.parse(doc);

        if (parsed && parsed.kind === 'CustomResourceDefinition') {
          crds.push(parsed as K8sCRD);
        }
      } catch (error) {
        getLogger().error({ error }, `Failed to parse YAML document from ${source.id}`);
      }
    }

    return crds;
  } catch (error) {
    throw new Error(`Failed to fetch CRDs from ${source.name}: ${error}`);
  }
}

export function parseCRDs(crds: Array<K8sCRD>, source: CRDSource): Array<ParsedCRD> {
  const parsed: Array<ParsedCRD> = [];

  for (const crd of crds) {
    const group = crd.spec.group;
    const kind = crd.spec.names.kind;

    // Skip if CRD doesn't belong to the specified group.
    if (group !== source.group) {
      continue;
    }

    // Extract plural name from metadata.name (e.g., "kongconsumers" from "kongconsumers.configuration.konghq.com")
    const pluralName = crd.metadata.name.split('.')[0];

    for (const versionSpec of crd.spec.versions) {
      const schema = versionSpec.schema?.openAPIV3Schema;

      if (!schema) {
        getLogger().warn(`No OpenAPI v3 schema found for ${kind} ${versionSpec.name}`);
        continue;
      }

      parsed.push({
        name: crd.metadata.name,
        pluralName,
        group,
        kind,
        version: versionSpec.name,
        openAPIV3Schema: schema,
        rawYAML: YAML.stringify(crd),
        source,
      });
    }
  }

  return parsed;
}

export async function fetchAndParseCRDs(source: CRDSource): Promise<Array<ParsedCRD>> {
  const crds = await fetchCRDs(source);
  return parseCRDs(crds, source);
}
