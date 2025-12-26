import { test, expect } from 'bun:test';
import { saveSchemas, detectChangedSchemas, generateSchemaPath } from '../../src/file-operations';
import { withTempDir } from '../helpers';
import type { ParsedCRD } from '../../src/types';
import { readFile, writeFile } from 'fs/promises';

test('saveSchemas writes files and detectChangedSchemas detects no-change', async () => {
  await withTempDir(async (dir) => {
    const crd: ParsedCRD = {
      name: 'widgets.examples.k8s.io',
      pluralName: 'widgets',
      group: 'examples.k8s.io',
      kind: 'Widget',
      version: 'v1',
      openAPIV3Schema: { type: 'object', properties: { spec: { type: 'object' } } } as any,
      rawYAML: '',
      source: { type: 'url', id: 't', name: 't', url: '' } as any,
    };

    await saveSchemas([crd], dir);
    const path = `${dir}/${generateSchemaPath(crd.group, crd.kind, crd.version)}`;

    const content = await readFile(path, 'utf8');
    expect(content, 'saved file should contain JSON schema content').toContain('"type"');

    const changed = await detectChangedSchemas([crd], dir);
    expect(changed.length, 'no changes should be detected immediately after save').toBe(0);

    // Modify file to simulate change
    await writeFile(path, JSON.stringify({ changed: true }));

    const changed2 = await detectChangedSchemas([crd], dir);
    expect(changed2.length, 'changed schema should be detected after file modification').toBe(1);
  });
});
