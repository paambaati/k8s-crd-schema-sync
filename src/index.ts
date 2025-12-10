#!/usr/bin/env bun
/**
 * Main orchestrator for CRD schema sync.
 */

import type { ParsedCRD, SyncResult, SyncConfig } from './types';
import { getDefaultConfig, loadConfigFromEnv, mergeConfigs, parseConfigFromCLI } from './config';
import { fetchAndParseCRDs } from './crd-parser';
import { saveSchemas, detectChangedSchemas, getSchemaPath } from './file-operations';
import { GitHubManager, parseGitHubRepo } from './github-manager';
import { initializeLogger, getLogger } from './logger';

export async function runSync(providedConfig?: Partial<SyncConfig>): Promise<SyncResult> {
  const baseConfig = getDefaultConfig();
  const envConfig = loadConfigFromEnv();
  const cliConfig = providedConfig || {};
  const config = mergeConfigs(baseConfig, { ...envConfig, ...cliConfig });

  initializeLogger(config.verbose);
  const logger = getLogger();

  const result: SyncResult = {
    success: false,
    message: '',
    generatedSchemas: [],
    changedSchemas: [],
    errors: [],
  };

  try {
    logger.info('Starting CRD schema sync...');
    logger.debug({
      targetRepo: config.targetRepo,
      outputDir: config.outputDir,
      sources: config.sources.map((s) => s.name),
    });

    const allCRDs: Array<ParsedCRD> = [];

    for (const source of config.sources) {
      if (!source.enabled) {
        continue;
      }

      try {
        logger.info(`Fetching CRDs from ${source.name}...`);

        const crds = await fetchAndParseCRDs(source);
        allCRDs.push(...crds);

        logger.debug(`Parsed ${crds.length} CRDs from ${source.name}`);
      } catch (error) {
        const errorMsg = `Failed to fetch from ${source.name}: ${error}`;
        logger.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    result.generatedSchemas = allCRDs;

    logger.info('Detecting changes...');

    const changedCRDs = await detectChangedSchemas(allCRDs, config.outputDir);
    result.changedSchemas = changedCRDs;

    logger.debug(`${changedCRDs.length} schema(s) changed or new`);

    logger.info('Saving schemas to disk...');

    const files = await saveSchemas(allCRDs, config.outputDir);

    logger.debug(`Saved ${Object.keys(files).length} file(s)`);

    if (config.createPR && changedCRDs.length > 0) {
      if (!config.githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is required to create PRs');
      }

      if (config.dryRun) {
        logger.info('DRY RUN: Would create PR with changes');
        logger.debug({ files: Object.keys(files) });
        result.message = 'Dry run completed. PR would have been created.';
      } else {
        logger.info('Creating GitHub PR...');

        const { owner, repo } = parseGitHubRepo(config.targetRepo);
        const gh = new GitHubManager({
          token: config.githubToken,
          owner,
          repo,
          baseBranch: config.targetBranch,
        });

        const timestamp = new Date().toISOString();
        const branchName = `crd-sync/${timestamp.slice(0, 10)}`;
        const sourceNames = [...new Set(changedCRDs.map((c) => c.source.name))].join(', ');

        const prTitle = config.prTitleTemplate.replace('{source}', sourceNames);
        const prBody = config.prBodyTemplate
          .replace('{source}', sourceNames)
          .replace('{count}', changedCRDs.length.toString())
          .replace('{timestamp}', timestamp);

        const prFiles: Record<string, string> = {};
        for (const crd of changedCRDs) {
          const schemaPath = getSchemaPath(crd.group, crd.kind, crd.version);
          prFiles[schemaPath] = files[schemaPath] || '{}';
        }

        const prUrl = await gh.createPRWithFiles({
          title: prTitle,
          body: prBody,
          files: prFiles,
          branchName,
        });

        result.prUrl = prUrl;
        result.message = `Successfully created PR: ${prUrl}`;

        logger.info(`PR created: ${prUrl}`);
      }
    } else if (changedCRDs.length === 0) {
      result.message = 'No changes detected';
    } else {
      result.message = 'Schemas generated successfully';
    }

    result.success = true;

    logger.info('Sync completed successfully!');
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.message = errorMsg;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

if (import.meta.main) {
  const { config: cliConfig, showHelp, showVersion } = parseConfigFromCLI(process.argv);

  if (showHelp || showVersion) {
    process.exit(0);
  }

  /* oxlint-disable no-console */
  runSync(cliConfig).then(async (result) => {
    console.log('\n📋 Sync Summary:');
    console.log(`   CRDs fetched: ${result.generatedSchemas.length}`);
    console.log(`   Changed schemas: ${result.changedSchemas.length}`);
    console.log(`   Status: ${result.message}`);

    if (result.prUrl) {
      console.log(`   PR: ${result.prUrl}`);
      // Output PR URL for GitHub Actions
      if (process.env.GITHUB_OUTPUT) {
        const outputFile = Bun.file(process.env.GITHUB_OUTPUT);
        const existing = await outputFile.text().catch(() => '');
        await Bun.write(outputFile, existing + `pr-url=${result.prUrl}\n`);
      }
    }
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      result.errors.forEach((err) => console.log(`     - ${err}`));
    }
    process.exit(result.success ? 0 : 1);
  });
  /* oxlint-enable no-console */
}
