#!/usr/bin/env bun
/**
 * Main orchestrator for CRD schema sync.
 */

import type { ParsedCRD, SyncResult, SyncConfig, K8sClusterCRDSource } from './types';
import { getDefaultConfig, loadConfigFromEnv, mergeConfigs, parseConfigFromCLI } from './config';
import { fetchAndParseCRDs } from './crd-parser';
import { saveSchemas, detectChangedSchemas, getSchemaPath } from './file-operations';
import { GitHubManager, parseGitHubRepo } from './github-manager';
import { initializeLogger, getLogger } from './logger';
import { getClusterInfo } from './k8s-client';

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

/**
 * Dump CRDs from a Kubernetes cluster
 */
export async function dumpCRDsFromCluster(
  contextName?: string,
  outputDir: string = './schemas'
): Promise<SyncResult> {
  initializeLogger(false);
  const logger = getLogger();

  const result: SyncResult = {
    success: false,
    message: '',
    generatedSchemas: [],
    changedSchemas: [],
    errors: [],
  };

  try {
    logger.info('Fetching cluster information...');
    const clusterInfo = await getClusterInfo(contextName);

    logger.info(`Dumping CRDs from cluster: ${clusterInfo.name}`);
    logger.info(`API Server: ${clusterInfo.serverUrl}`);

    // Create a k8s-cluster source
    const k8sSource: K8sClusterCRDSource = {
      type: 'k8s-cluster',
      id: 'k8s-cluster',
      name: clusterInfo.name,
      context: contextName,
      enabled: true,
    };

    logger.info('Fetching CRDs from cluster...');
    const crds = await fetchAndParseCRDs(k8sSource);
    result.generatedSchemas = crds;

    logger.info(`Fetched ${crds.length} CRDs`);

    logger.info('Saving schemas to disk...');
    const files = await saveSchemas(crds, outputDir);

    logger.debug(`Saved ${Object.keys(files).length} file(s)`);

    result.message = `Successfully dumped ${crds.length} CRDs to ${outputDir}`;
    result.success = true;

    logger.info('Dump completed successfully!');
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.message = errorMsg;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

/**
 * Download CRDs from configured sources
 */
export async function downloadCRDsFromSources(
  providedConfig?: Partial<SyncConfig>
): Promise<SyncResult> {
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
    logger.info('Downloading CRDs from configured sources...');
    logger.debug({
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

    logger.info('Saving schemas to disk...');
    const files = await saveSchemas(allCRDs, config.outputDir);

    logger.debug(`Saved ${Object.keys(files).length} file(s)`);

    result.message = `Successfully downloaded ${allCRDs.length} CRDs to ${config.outputDir}`;
    result.success = true;

    logger.info('Download completed successfully!');
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.message = errorMsg;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

/**
 * Publish schemas via PR
 */
export async function publishSchemas(providedConfig?: Partial<SyncConfig>): Promise<SyncResult> {
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
    logger.info('Publishing schemas via PR...');
    logger.debug({
      targetRepo: config.targetRepo,
      outputDir: config.outputDir,
    });

    // Read existing schemas from disk
    const { readdirSync, statSync } = await import('fs');
    const allCRDs: Array<ParsedCRD> = [];

    const groupDirs = readdirSync(config.outputDir).filter((f) => {
      const path = `${config.outputDir}/${f}`;
      return statSync(path).isDirectory();
    });

    for (const groupDir of groupDirs) {
      const schemaFiles = readdirSync(`${config.outputDir}/${groupDir}`).filter((f) =>
        f.endsWith('.json')
      );

      for (const schemaFile of schemaFiles) {
        const content = await Bun.file(`${config.outputDir}/${groupDir}/${schemaFile}`).text();
        try {
          const schema = JSON.parse(content);
          // Note: We reconstruct basic info from filenames and schema
          const [kind, version] = schemaFile.replace('.json', '').split('_');
          allCRDs.push({
            name: `${kind.toLowerCase()}.${groupDir}`,
            pluralName: kind.toLowerCase(),
            group: groupDir,
            kind: kind,
            version: version || 'v1',
            openAPIV3Schema: schema,
            rawYAML: '',
            source: {
              type: 'url',
              id: 'local',
              name: 'Local Schemas',
              url: '',
              group: groupDir,
            },
          });
        } catch (error) {
          logger.warn(`Failed to parse schema ${schemaFile}: ${error}`);
        }
      }
    }

    result.generatedSchemas = allCRDs;

    if (!config.createPR) {
      result.message = 'Publish command requires --create-pr flag to be set';
      result.success = true;
      logger.info(result.message);
      return result;
    }

    if (!config.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required to create PRs');
    }

    const changedCRDs = allCRDs.slice(0, Math.min(10, allCRDs.length)); // Limit for demo
    result.changedSchemas = changedCRDs;

    if (changedCRDs.length === 0) {
      result.message = 'No schemas to publish';
      result.success = true;
      return result;
    }

    if (config.dryRun) {
      logger.info('DRY RUN: Would create PR with changes');
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

      const prFiles: Record<string, string> = {};
      for (const crd of changedCRDs) {
        const schemaPath = getSchemaPath(crd.group, crd.kind, crd.version);
        const fullPath = `${config.outputDir}/${schemaPath}`;
        try {
          const content = await Bun.file(fullPath).text();
          prFiles[schemaPath] = content;
        } catch (error) {
          logger.warn(`Failed to read ${fullPath}: ${error}`);
        }
      }

      const prTitle = 'chore: publish CRD schemas';
      const prBody = `## CRD Schema Publication

Schemas updated: ${changedCRDs.length}
Timestamp: ${timestamp}

Generated by [\`k8s-crd-schema-sync\`](https://github.com/paambaati/k8s-crd-schema-sync)`;

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

    result.success = true;
    logger.info('Publish completed successfully!');
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
  const {
    command,
    config: cliConfig,
    showHelp,
    showVersion,
    context,
    cli,
  } = parseConfigFromCLI(process.argv);

  if (showHelp || showVersion) {
    process.exit(0);
  }

  // If no command specified, show help
  if (!command) {
    cli.outputHelp();
    process.exit(0);
  }

  let inputCommand: Promise<SyncResult>;

  if (command === 'dump') {
    inputCommand = dumpCRDsFromCluster(context, cliConfig.outputDir);
  } else if (command === 'download') {
    inputCommand = downloadCRDsFromSources(cliConfig);
  } else if (command === 'publish') {
    inputCommand = publishSchemas(cliConfig);
  } else {
    // Should not reach here given the check above
    inputCommand = runSync(cliConfig);
  }

  /* oxlint-disable no-console */
  inputCommand.then(async (result) => {
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
  }).catch(error => { throw error });
  /* oxlint-enable no-console */
}
