import { test, expect } from 'bun:test';
import { isIntegrationRun, withTempDir } from '../helpers';
import { dumpCRDsFromCluster } from '../../src/index';

if (!isIntegrationRun()) {
  test('integration: dump CRDs (skipped)', () => {
    // Integration tests are skipped unless RUN_INTEGRATION=true
  });
} else {
  test('integration: dump CRDs from k3d cluster', async () => {
    // This test requires k3d, kubectl, and docker available in the environment.
    // It will create a lightweight cluster, apply the simple CRD fixture, invoke the dump function,
    // and then destroy the cluster.

    const create = Bun.spawnSync(['k3d', 'cluster', 'create', 'kcss-test']);
    expect(create.exitCode).toBe(0);

    try {
      const apply = Bun.spawnSync(['kubectl', 'apply', '-f', 'test/fixtures/simple-crd.yaml']);
      expect(apply.exitCode).toBe(0);

      await withTempDir(async (dir) => {
        const res = await dumpCRDsFromCluster(undefined, dir);
        expect(res.success).toBe(true);
        expect(res.generatedSchemas.length).toBeGreaterThanOrEqual(1);
      });
    } finally {
      Bun.spawnSync(['k3d', 'cluster', 'delete', 'kcss-test']);
    }
  });
}
