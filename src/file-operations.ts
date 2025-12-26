/**
 * File operations for saving and detecting schema changes
 */

import { readdirSync, statSync, mkdirSync } from 'fs';
import { getLogger } from './logger';
import type { ParsedCRD } from './types';
import { convertOpenAPIv3ToJSONSchema, generateSchemaFilename } from './schema-converter';

export async function ensureDirectoryExists(dir: string): Promise<void> {
  const dirFile = Bun.file(dir);
  if (!(await dirFile.exists())) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save schemas to filesystem.
 * Creates directory structure: {workDir}/{group}/{kind}_{version}.json
 */
export async function saveSchemas(
  crds: Array<ParsedCRD>,
  workDir: string
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  await ensureDirectoryExists(workDir);

  for (const crd of crds) {
    const schema = convertOpenAPIv3ToJSONSchema(crd.openAPIV3Schema);
    const filename = generateSchemaFilename(crd.kind, crd.version);
    const dirPath = `${workDir}/${crd.group}`;
    const fullPath = `${dirPath}/${filename}`;

    await ensureDirectoryExists(dirPath);

    const content = JSON.stringify(schema, null, 2);
    await Bun.write(fullPath, content);

    files[`${crd.group}/${filename}`] = content;
  }

  return files;
}

/**
 * Compare new schemas with existing ones.
 * Returns schemas that have changed.
 */
export async function detectChangedSchemas(
  newCRDs: Array<ParsedCRD>,
  workDir: string
): Promise<Array<ParsedCRD>> {
  const changed: Array<ParsedCRD> = [];

  for (const crd of newCRDs) {
    const schema = convertOpenAPIv3ToJSONSchema(crd.openAPIV3Schema);
    const filename = generateSchemaFilename(crd.kind, crd.version);
    const filePath = `${workDir}/${crd.group}/${filename}`;

    const f = Bun.file(filePath);
    if (!(await f.exists())) {
      changed.push(crd);
      continue;
    }

    // Compare content, and pick up changed CRDs.
    try {
      const existing = JSON.parse(await f.text());
      const newContent = JSON.stringify(schema, Object.keys(schema).sort());
      const existingContent = JSON.stringify(existing, Object.keys(existing).sort());

      if (newContent !== existingContent) {
        changed.push(crd);
      }
    } catch {
      // If we can't read/parse, consider it changed.
      changed.push(crd);
    }
  }

  return changed;
}

/**
 * Load existing schemas from filesystem.
 */
export async function loadExistingSchemas(workDir: string): Promise<Record<string, unknown>> {
  const schemas: Record<string, unknown> = {};

  try {
    readdirSync(workDir);
  } catch {
    return schemas;
  }

  async function walkDir(dir: string, prefix = ''): Promise<void> {
    try {
      const files = readdirSync(dir);

      for (const file of files) {
        const filePath = `${dir}/${file}`;
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
          await walkDir(filePath, `${prefix}${file}/`);
        } else if (file.endsWith('.json')) {
          try {
            const content = await Bun.file(filePath).text();
            schemas[`${prefix}${file}`] = JSON.parse(content);
          } catch (error) {
            getLogger().error({ error }, `Failed to load schema from ${filePath}`);
          }
        }
      }
    } catch (error) {
      getLogger().error({ error }, `Failed to walk directory ${dir}`);
    }
  }

  await walkDir(workDir);
  return schemas;
}

/**
 * Generate filepath for schema file.
 * @example 'configuration.konghq.com/kongconsumer_v1.json'
 */
export function generateSchemaPath(group: string, kind: string, version: string): string {
  const filename = generateSchemaFilename(kind, version);
  return `${group}/${filename}`;
}
