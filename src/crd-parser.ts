/**
 * Fetch and parse Kubernetes CRDs from remote sources or clusters.
 * Uses direct HTTP requests to the K8s API for clusters.
 */

import YAML from 'yaml';
import { getLogger } from './logger';
import type { CRDSource, URLCRDSource, K8sClusterCRDSource, ParsedCRD, K8sCRD } from './types';
import { fetchCRDsFromCluster } from './k8s-client';

export async function fetchCRDs(source: CRDSource): Promise<Array<K8sCRD>> {
  if (source.type === 'url') {
    return fetchCRDsFromURL(source);
  } else if (source.type === 'k8s-cluster') {
    return fetchCRDsFromK8sCluster(source);
  }

  throw new Error(`Unknown source type: ${source as never}`);
}

async function fetchCRDsFromURL(source: URLCRDSource): Promise<Array<K8sCRD>> {
  try {
    const response = await fetch(source.url);

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

async function fetchCRDsFromK8sCluster(source: K8sClusterCRDSource): Promise<Array<K8sCRD>> {
  try {
    const crds = await fetchCRDsFromCluster(
      source.context,
      source.namespace,
      source.apiServerUrl,
      source.caPath
    );
    return crds as Array<K8sCRD>;
  } catch (error) {
    throw new Error(`Failed to fetch CRDs from cluster ${source.name}: ${error}`);
  }
}

export function parseCRDs(crds: Array<K8sCRD>, source: CRDSource): Array<ParsedCRD> {
  const parsed: Array<ParsedCRD> = [];

  for (const crd of crds) {
    const group = crd.spec.group;
    const kind = crd.spec.names.kind;

    // For k8s clusters, accept all groups. For URLs, filter by group if specified.
    if (
      source.type === 'url' &&
      (source as URLCRDSource).group &&
      group !== (source as URLCRDSource).group
    ) {
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
