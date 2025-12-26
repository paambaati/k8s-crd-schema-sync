import { test, expect } from 'bun:test';
import { parseCRDs } from '../../src/crd-parser';

test('parseCRDs filters by group for URL sources', () => {
  const crd = {
    metadata: { name: 'others.examples.k8s.io' },
    spec: {
      group: 'others.examples.k8s.io',
      names: { kind: 'Other' },
      versions: [
        {
          name: 'v1',
          schema: { openAPIV3Schema: { type: 'object' } },
        },
      ],
    },
  } as any;

  const source = {
    type: 'url',
    id: 's',
    name: 'S',
    url: '',
    enabled: true,
    group: 'examples.k8s.io',
  } as any;

  const parsed = parseCRDs([crd], source);
  expect(parsed.length, 'CRD from a different group should be filtered out for URL sources').toBe(
    0
  );
});
