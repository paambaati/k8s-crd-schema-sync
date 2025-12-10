/**
 * OpenAPI v3 to JSON Schema conversion
 * Converts Kubernetes OpenAPI v3 schemas to JSON Schema format
 */

import type { JSONSchema } from './types';

/**
 * Convert OpenAPI v3 schema to JSON Schema
 * Handles Kubernetes-specific OpenAPI extensions and schema properties
 */
export function convertOpenAPIv3ToJSONSchema(openAPIv3: Record<string, unknown>): JSONSchema {
  const converted = convertSchema(openAPIv3);

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    ...converted,
    type: converted.type as string,
  };
}

function convertSchema(schema: unknown): Partial<JSONSchema> {
  if (typeof schema !== 'object' || schema === null) {
    return { type: 'unknown' };
  }

  const obj = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Handle type
  if (obj.type) {
    result.type = obj.type;
  }

  // Handle description
  if (obj.description) {
    result.description = obj.description;
  }

  // Handle enum
  if (obj.enum) {
    result.enum = obj.enum;
  }

  // Handle default
  if (obj.default !== undefined) {
    result.default = obj.default;
  }

  // Handle format
  if (obj.format && typeof obj.format === 'string') {
    result.format = obj.format;
  }

  // Handle numeric constraints
  if (typeof obj.minimum === 'number') {
    result.minimum = obj.minimum;
  }
  if (typeof obj.maximum === 'number') {
    result.maximum = obj.maximum;
  }
  if (typeof obj.exclusiveMinimum === 'number') {
    result.exclusiveMinimum = obj.exclusiveMinimum;
  }
  if (typeof obj.exclusiveMaximum === 'number') {
    result.exclusiveMaximum = obj.exclusiveMaximum;
  }

  // Handle string constraints
  if (typeof obj.minLength === 'number') {
    result.minLength = obj.minLength;
  }
  if (typeof obj.maxLength === 'number') {
    result.maxLength = obj.maxLength;
  }
  if (obj.pattern) {
    result.pattern = obj.pattern;
  }

  // Handle array properties
  if (obj.items) {
    result.items = convertSchema(obj.items);
  }
  if (typeof obj.minItems === 'number') {
    result.minItems = obj.minItems;
  }
  if (typeof obj.maxItems === 'number') {
    result.maxItems = obj.maxItems;
  }

  // Handle object properties
  if (obj.properties && typeof obj.properties === 'object') {
    result.properties = {};
    for (const [key, value] of Object.entries(obj.properties)) {
      (result.properties as Record<string, unknown>)[key] = convertSchema(value);
    }
  }

  if (obj.additionalProperties !== undefined) {
    if (typeof obj.additionalProperties === 'object') {
      result.additionalProperties = convertSchema(obj.additionalProperties);
    } else {
      result.additionalProperties = obj.additionalProperties;
    }
  }

  // Handle required fields
  if (Array.isArray(obj.required)) {
    result.required = obj.required.filter((r) => typeof r === 'string');
  }

  // Handle allOf, anyOf, oneOf
  if (Array.isArray(obj.allOf)) {
    result.allOf = obj.allOf.map(convertSchema);
  }
  if (Array.isArray(obj.anyOf)) {
    result.anyOf = obj.anyOf.map(convertSchema);
  }
  if (Array.isArray(obj.oneOf)) {
    result.oneOf = obj.oneOf.map(convertSchema);
  }

  // Handle not
  if (obj.not) {
    result.not = convertSchema(obj.not);
  }

  // Handle ref (JSON Pointer)
  if (obj.$ref) {
    result.$ref = obj.$ref;
  }

  // Handle Kubernetes-specific validations
  if (obj['x-kubernetes-validations']) {
    // Keep K8s validations as comments would, but for JSON schema we can skip
    // since JSON schema doesn't support these
  }

  // Preserve unknown fields flag
  if (obj['x-kubernetes-preserve-unknown-fields']) {
    result['x-kubernetes-preserve-unknown-fields'] = obj['x-kubernetes-preserve-unknown-fields'];
  }

  // Keep examples if present
  if (obj.example) {
    result.example = obj.example;
  }
  if (obj.examples) {
    result.examples = obj.examples;
  }

  return result;
}

/**
 * Generate filename for schema based on Kind and version
 * Format: {kind}_{version}.json (lowercase)
 * Example: kongconsumer_v1.json
 */
export function generateSchemaFilename(kind: string, version: string): string {
  const normalizedKind = kind.toLowerCase();
  const normalizedVersion = version.toLowerCase();
  return `${normalizedKind}_${normalizedVersion}.json`;
}
