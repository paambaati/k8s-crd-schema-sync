/**
 * Kubernetes API client for fetching CRDs directly from a cluster.
 * Reads kubeconfig from standard locations and uses network API calls for querying the k8s cluster.
 */

import { expandUser } from './utils';
import YAML from 'yaml';
import { getLogger } from './logger';
import { K8sAuthConfig, K8sCRD, K8sCRDList, KubeConfig } from './types';

/**
 * Load kubeconfig from standard locations.
 */
async function loadKubeConfig(): Promise<KubeConfig> {
  const logger = getLogger();
  const kubeconfigPaths = [process.env.KUBECONFIG, expandUser('~/.kube/config')].filter(
    (p): p is string => Boolean(p)
  );

  for (const path of kubeconfigPaths) {
    const file = Bun.file(path);
    if (await file.exists()) {
      try {
        const content = await file.text();
        const config = YAML.parse(content) as KubeConfig;
        logger.debug(`Loaded kubeconfig from ${path}`);
        return config;
      } catch (error) {
        logger.warn(`Failed to parse kubeconfig at ${path}: ${error}`);
      }
    }
  }

  throw new Error(
    'No kubeconfig found. Please ensure kubeconfig is at ~/.kube/config or KUBECONFIG is set'
  );
}

/**
 * Get authentication config for a specific kube context.
 */
async function getAuthConfig(kubeconfig: KubeConfig, contextName?: string): Promise<K8sAuthConfig> {
  const logger = getLogger();
  const currentContextName = contextName || kubeconfig['current-context'];

  if (!currentContextName) {
    throw new Error('No current context found in kubeconfig and no context specified');
  }

  const context = kubeconfig.contexts.find((c) => c.name === currentContextName);
  if (!context) {
    throw new Error(`Context '${currentContextName}' not found in kubeconfig`);
  }

  const clusterName = context.context.cluster;
  const userName = context.context.user;

  const cluster = kubeconfig.clusters.find((c) => c.name === clusterName);
  if (!cluster) {
    throw new Error(`Cluster '${clusterName}' not found in kubeconfig`);
  }

  const user = kubeconfig.users.find((u) => u.name === userName);
  if (!user) {
    logger.warn(`User '${userName}' not found in kubeconfig, proceeding without authentication`);
  }

  const serverUrl = cluster.cluster.server;
  if (!serverUrl) {
    throw new Error(`Server URL not found for cluster '${clusterName}'`);
  }

  const authConfig: K8sAuthConfig = {
    serverUrl,
    skipTlsVerify: cluster.cluster['insecure-skip-tls-verify'],
  };

  // Handle CA certificate.
  if (cluster.cluster['certificate-authority']) {
    authConfig.caPath = expandUser(cluster.cluster['certificate-authority']);
  } else if (cluster.cluster['certificate-authority-data']) {
    const tempCa = `/tmp/k8s-ca-${Date.now()}.crt`;
    const caData = Buffer.from(cluster.cluster['certificate-authority-data'], 'base64').toString(
      'utf-8'
    );
    await Bun.write(tempCa, caData);
    authConfig.caPath = tempCa;
  }

  // Handle client certificate and key file.
  if (user) {
    if (user.user['client-certificate']) {
      authConfig.cert = expandUser(user.user['client-certificate']);
    } else if (user.user['client-certificate-data']) {
      const tempCert = `/tmp/k8s-cert-${Date.now()}.crt`;
      const certData = Buffer.from(user.user['client-certificate-data'], 'base64').toString(
        'utf-8'
      );
      await Bun.write(tempCert, certData);
      authConfig.cert = tempCert;
    }

    if (user.user['client-key']) {
      authConfig.key = expandUser(user.user['client-key']);
    } else if (user.user['client-key-data']) {
      const tempKey = `/tmp/k8s-key-${Date.now()}.key`;
      const keyData = Buffer.from(user.user['client-key-data'], 'base64').toString('utf-8');
      await Bun.write(tempKey, keyData);
      authConfig.key = tempKey;
    }

    // Handle bearer token (if present).
    if (user.user.token) {
      authConfig.token = user.user.token;
    }

    // Handle third-party auth providers (e.g., gke-gcloud-auth-plugin).
    if (user.user.exec && !authConfig.token) {
      const execConfig = user.user.exec as Record<string, any>;
      const command = execConfig.command;
      if (command) {
        try {
          logger.debug(`Executing auth command: ${command}`);
          const proc = Bun.spawn([command], {
            stdout: 'pipe',
            stderr: 'pipe',
          });
          const output = await new Response(proc.stdout).text();
          try {
            const authResponse = JSON.parse(output);
            if (authResponse.status?.token) {
              authConfig.token = authResponse.status.token;
              logger.debug('Retrieved token from exec auth provider');
            }
          } catch {
            logger.warn('Failed to parse exec auth response');
          }
        } catch (error) {
          logger.warn(`Failed to execute auth command: ${error}`);
        }
      }
    }
  }

  return authConfig;
}

/**
 * Fetch CRDs from a Kubernetes cluster via API.
 */
export async function fetchCRDsFromCluster(
  contextName?: string,
  namespace?: string,
  apiServerUrl?: string,
  caPath?: string
): Promise<Array<K8sCRD>> {
  const logger = getLogger();

  try {
    const kubeconfig = await loadKubeConfig();
    let authConfig = await getAuthConfig(kubeconfig, contextName);

    if (apiServerUrl) {
      authConfig.serverUrl = apiServerUrl;
    }
    if (caPath) {
      authConfig.caPath = caPath;
    }

    logger.debug(`Fetching CRDs from cluster: ${authConfig.serverUrl}`);

    const url = `${authConfig.serverUrl}/apis/apiextensions.k8s.io/v1/customresourcedefinitions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authConfig.token) {
      headers['Authorization'] = `Bearer ${authConfig.token}`;
    }

    const fetchOptions: any = {
      method: 'GET',
      headers,
    };

    // Handle TLS verification.
    if (authConfig.skipTlsVerify) {
      logger.warn(
        'TLS verification disabled - this is insecure and should not be used in production'
      );
      fetchOptions.tls = {
        rejectUnauthorized: false,
      };
    } else if (authConfig.caPath) {
      try {
        const caCert = await Bun.file(authConfig.caPath).text();
        fetchOptions.tls = {
          ca: caCert,
        };
        logger.debug(`Using CA certificate from ${authConfig.caPath}`);
      } catch (error) {
        logger.warn(`Failed to read CA certificate from ${authConfig.caPath}: ${error}`);
      }
    }

    const response = await fetch(url, fetchOptions as any);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as K8sCRDList;

    if (!Array.isArray(data.items)) {
      throw new Error('Invalid response structure - expected items array');
    }

    logger.debug(`Fetched ${data.items.length} CRDs from cluster`);

    return data.items;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch CRDs from cluster: ${errorMsg}`);
  }
}

/**
 * Get k8s cluster info (name and server URL) for the given kube context.
 */
export async function getClusterInfo(contextName?: string): Promise<{
  name: string;
  serverUrl: string;
}> {
  const kubeconfig = await loadKubeConfig();
  const authConfig = await getAuthConfig(kubeconfig, contextName);
  const currentContextName = contextName || kubeconfig['current-context'];

  return {
    name: currentContextName,
    serverUrl: authConfig.serverUrl,
  };
}
