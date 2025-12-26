import { test, expect } from 'bun:test';
import { withTempDir } from '../helpers';
import { dumpCRDsFromCluster } from '../../src/index';

test(
  'integration: dump CRDs from k3d cluster',
  async () => {
    // This test requires k3d, kubectl, and docker available in the environment.
    // Fail loudly with diagnostic output if prerequisites are missing.

    const dockerCheck = Bun.spawnSync(['docker', 'info']);
    expect(
      dockerCheck.exitCode,
      `Docker must be available and running. stdout: ${dockerCheck.stdout?.toString()}\nstderr: ${dockerCheck.stderr?.toString()}`
    ).toBe(0);

    const k3dCheck = Bun.spawnSync(['k3d', '--version']);
    expect(
      k3dCheck.exitCode,
      `k3d must be installed and in PATH. stdout: ${k3dCheck.stdout?.toString()}\nstderr: ${k3dCheck.stderr?.toString()}`
    ).toBe(0);

    const kubectlCheck = Bun.spawnSync(['kubectl', 'version', '--client']);
    expect(
      kubectlCheck.exitCode,
      `kubectl must be installed and in PATH. stdout: ${kubectlCheck.stdout?.toString()}\nstderr: ${kubectlCheck.stderr?.toString()}`
    ).toBe(0);

    const clusterName = `kcss-test-${Date.now()}`;

    // Create cluster.
    const create = Bun.spawnSync(['k3d', 'cluster', 'create', clusterName, '--wait']);
    expect(
      create.exitCode,
      `k3d cluster create failed. stdout: ${create.stdout?.toString()}\nstderr: ${create.stderr?.toString()}`
    ).toBe(0);

    // Export kubeconfig for kubectl and the client.
    const kubeconfigResult = Bun.spawnSync(['k3d', 'kubeconfig', 'get', clusterName]);
    expect(
      kubeconfigResult.exitCode,
      `k3d kubeconfig get failed. stdout: ${kubeconfigResult.stdout?.toString()}\nstderr: ${kubeconfigResult.stderr?.toString()}`
    ).toBe(0);

    const kubeconfigPath = `kubeconfig-${clusterName}`;
    await Bun.write(kubeconfigPath, kubeconfigResult.stdout?.toString() || '');
    process.env.KUBECONFIG = `${process.cwd()}/${kubeconfigPath}`;

    try {
      const apply = Bun.spawnSync([
        'kubectl',
        '--kubeconfig',
        process.env.KUBECONFIG,
        'apply',
        '-f',
        'test/fixtures/simple-crd.yaml',
      ]);
      expect(
        apply.exitCode,
        `kubectl apply failed. stdout: ${apply.stdout?.toString()}\nstderr: ${apply.stderr?.toString()}`
      ).toBe(0);

      await withTempDir(async (dir) => {
        const res = await dumpCRDsFromCluster(undefined, dir);
        expect(res.success, 'dumpCRDsFromCluster should succeed').toBe(true);
        expect(res.generatedSchemas.length, 'should fetch at least one CRD').toBeGreaterThanOrEqual(
          1
        );
      });
    } finally {
      Bun.spawnSync(['k3d', 'cluster', 'delete', clusterName]);
    }
  },
  { timeout: 10 * 60 * 1000 }
);
