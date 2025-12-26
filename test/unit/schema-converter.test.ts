import { test, expect } from 'bun:test';
import { convertOpenAPIv3ToJSONSchema, generateSchemaFilename } from '../../src/schema-converter';

test('generateSchemaFilename normalizes kind and version', () => {
  const fn = generateSchemaFilename('MyKind', 'v1');
  expect(fn, 'filename should be lowercase kind_version.json').toBe('mykind_v1.json');
});

test('convertOpenAPIv3ToJSONSchema sets additionalProperties=false for nested objects', () => {
  const openapi = {
    type: 'object',
    properties: {
      spec: {
        type: 'object',
        properties: {
          size: { type: 'integer' },
        },
      },
    },
  } as any;

  const converted = convertOpenAPIv3ToJSONSchema(openapi as any);

  expect(converted.type, 'root converted schema should retain type object').toBe('object');
  expect(
    (converted.properties as any).spec.properties.size.type,
    'nested property should be converted and present'
  ).toBe('integer');
  expect(
    (converted.properties as any).spec.additionalProperties,
    'nested object should have additionalProperties=false for strict validation'
  ).toBe(false);
});
