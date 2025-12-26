import { test, expect } from 'bun:test';
import { parseCRDs } from '../../src/crd-parser';

test('parseCRDs extracts schema and metadata', () => {
  const crd = {
    metadata: { name: 'widgets.examples.k8s.io' },
    spec: {
      group: 'examples.k8s.io',
      names: { kind: 'Widget' },
      versions: [
        {
          name: 'v1',
          schema: {
            openAPIV3Schema: {
              type: 'object',
              properties: { spec: { type: 'object' } },
            },
          },
        },
      ],
    },
  } as any;

  const source = { type: 'url', id: 'test', name: 'Test', url: '', enabled: true } as any;

  const parsed = parseCRDs([crd], source);
  expect(parsed.length, 'should produce one parsed CRD').toBe(1);
  expect(parsed[0].group, 'group should be extracted from spec.group').toBe('examples.k8s.io');
  expect(parsed[0].kind, 'kind should be extracted from spec.names.kind').toBe('Widget');
  expect(parsed[0].version, 'version should match the version name').toBe('v1');
  expect(parsed[0].pluralName, 'pluralName should be derived from metadata.name').toBe('widgets');
});
