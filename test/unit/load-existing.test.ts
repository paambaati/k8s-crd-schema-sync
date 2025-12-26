import { test, expect } from 'bun:test';
import { loadExistingSchemas } from '../../src/file-operations';
import { withTempDir } from '../helpers';
import { writeFile, mkdir } from 'fs/promises';

test('loadExistingSchemas reads JSON schema files from disk', async () => {
  await withTempDir(async (dir) => {
    const groupDir = `${dir}/examples.k8s.io`;
    await mkdir(groupDir, { recursive: true });
    const filePath = `${groupDir}/widget_v1.json`;
    await writeFile(filePath, JSON.stringify({ type: 'object' }));

    const schemas = await loadExistingSchemas(dir);
    expect(Object.keys(schemas).length, 'should load one schema file from the workDir').toBe(1);
    expect(
      schemas['examples.k8s.io/widget_v1.json'],
      'loaded schema content should match written JSON'
    ).toEqual({ type: 'object' });
  });
});
