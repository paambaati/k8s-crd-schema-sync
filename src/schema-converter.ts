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
  const converted = convertSchema(openAPIv3, true);

  return {
    ...converted,
    type: converted.type as string,
  };
}

function convertSchema(schema: unknown, isRoot = false): Partial<JSONSchema> {
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
    result.items = convertSchema(obj.items, false);
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
      (result.properties as Record<string, unknown>)[key] = convertSchema(value, false);
    }
    // Set additionalProperties to false for objects with properties (strict validation)
    // but only if not at root level. This matches the behavior of openapi2jsonschema.py
    // (https://github.com/yannh/kubeconform/blob/master/scripts/openapi2jsonschema.py)
    if (!isRoot && result.additionalProperties === undefined) {
      result.additionalProperties = false;
    }
  }

  if (obj.additionalProperties !== undefined) {
    if (typeof obj.additionalProperties === 'object') {
      result.additionalProperties = convertSchema(obj.additionalProperties, false);
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
    result.allOf = obj.allOf.map((s) => convertSchema(s, false));
  }
  if (Array.isArray(obj.anyOf)) {
    result.anyOf = obj.anyOf.map((s) => convertSchema(s, false));
  }
  if (Array.isArray(obj.oneOf)) {
    result.oneOf = obj.oneOf.map((s) => convertSchema(s, false));
  }

  // Handle not
  if (obj.not) {
    result.not = convertSchema(obj.not, false);
  }

  // Handle ref (JSON Pointer)
  if (obj.$ref) {
    result.$ref = obj.$ref;
  }

  // Handle Kubernetes-specific extensions
  // Validations
  if (obj['x-kubernetes-validations']) {
    result['x-kubernetes-validations'] = obj['x-kubernetes-validations'];
  }

  // Field preservation and pruning
  if (obj['x-kubernetes-preserve-unknown-fields']) {
    result['x-kubernetes-preserve-unknown-fields'] = obj['x-kubernetes-preserve-unknown-fields'];
  }
  if (obj['x-kubernetes-pruning']) {
    result['x-kubernetes-pruning'] = obj['x-kubernetes-pruning'];
  }

  // List metadata
  if (obj['x-kubernetes-list-type']) {
    result['x-kubernetes-list-type'] = obj['x-kubernetes-list-type'];
  }
  if (obj['x-kubernetes-list-map-keys']) {
    result['x-kubernetes-list-map-keys'] = obj['x-kubernetes-list-map-keys'];
  }

  // Format variants
  if (obj['x-kubernetes-int-or-string']) {
    result['x-kubernetes-int-or-string'] = obj['x-kubernetes-int-or-string'];
  }

  // Resource embedding
  if (obj['x-kubernetes-embedded-resource']) {
    result['x-kubernetes-embedded-resource'] = obj['x-kubernetes-embedded-resource'];
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
