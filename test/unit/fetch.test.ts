import { test, expect } from 'bun:test';
import { fetchCRDs } from '../../src/crd-parser';
import { stubFetch } from '../helpers';

test('fetchCRDs fetches YAML from URL and parses CRD', async () => {
  const yaml = `apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: widgets.examples.k8s.io
spec:
  group: examples.k8s.io
  names:
    kind: Widget
  versions:
    - name: v1
      schema:
        openAPIV3Schema:
          type: object
`;

  const restore = stubFetch(async () => new Response(yaml, { status: 200 }));
  try {
    const source = {
      type: 'url',
      id: 'remote',
      name: 'Remote',
      url: 'https://example.test/crd.yaml',
    } as any;
    const crds = await fetchCRDs(source);
    expect(crds.length, 'should parse one CRD from fetched YAML').toBe(1);
    expect(crds[0].spec.group, 'parsed CRD should contain the group field').toBe('examples.k8s.io');
  } finally {
    restore();
  }
});
