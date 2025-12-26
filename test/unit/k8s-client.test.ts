import { test, expect } from 'bun:test';
import { withTempDir, stubFetch } from '../helpers';
import { writeFile } from 'fs/promises';
import YAML from 'yaml';
import { getClusterInfo, fetchCRDsFromCluster } from '../../src/k8s-client';

test('getClusterInfo reads kubeconfig and returns name and serverUrl', async () => {
  await withTempDir(async (dir) => {
    const kubeconfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{ name: 'test-cluster', cluster: { server: 'https://127.0.0.1:6443' } }],
      contexts: [{ name: 'test-context', context: { cluster: 'test-cluster', user: 'test-user' } }],
      users: [{ name: 'test-user', user: {} }],
      'current-context': 'test-context',
    };

    const path = `${dir}/kubeconfig.yaml`;
    await writeFile(path, YAML.stringify(kubeconfig), 'utf8');

    // Point KUBECONFIG to our temp kubeconfig
    const old = process.env.KUBECONFIG;
    process.env.KUBECONFIG = path;
    try {
      const info = await getClusterInfo();
      expect(info.name, 'cluster name should match context name').toBe('test-context');
      expect(info.serverUrl, 'serverUrl should be read from cluster.server').toBe(
        'https://127.0.0.1:6443'
      );
    } finally {
      process.env.KUBECONFIG = old;
    }
  });
});

test('fetchCRDsFromCluster fetches CRD list from apiServer and returns items', async () => {
  await withTempDir(async (dir) => {
    const kubeconfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [
        { name: 'c', cluster: { server: 'https://api.test', 'certificate-authority-data': '' } },
      ],
      contexts: [{ name: 'ctx', context: { cluster: 'c', user: 'u' } }],
      users: [{ name: 'u', user: { token: 'fake-token' } }],
      'current-context': 'ctx',
    };

    const path = `${dir}/kubeconfig.yaml`;
    await writeFile(path, YAML.stringify(kubeconfig), 'utf8');

    const responseBody = {
      items: [
        {
          metadata: { name: 'widgets.examples.k8s.io' },
          spec: { group: 'examples.k8s.io', names: { kind: 'Widget' }, versions: [] },
        },
      ],
    };

    const restore = stubFetch(async () => {
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const old = process.env.KUBECONFIG;
    process.env.KUBECONFIG = path;
    try {
      const items = await fetchCRDsFromCluster();
      expect(Array.isArray(items), 'result should be an array').toBe(true);
      expect(items.length, 'should return one item from stubbed response').toBe(1);
      expect(items[0].metadata.name, 'item should have metadata.name').toBe(
        'widgets.examples.k8s.io'
      );
    } finally {
      restore();
      process.env.KUBECONFIG = old;
    }
  });
});
