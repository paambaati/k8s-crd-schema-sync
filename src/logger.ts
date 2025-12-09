/**
 * Centralized logging configuration using Pino.
 */

import pino from 'pino';

let loggerInstance: pino.Logger;

export function initializeLogger(debugMode: boolean = false): void {
  const githubDebugEnabled =
    process.env.RUNNER_DEBUG === '1' || process.env.ACTIONS_STEP_DEBUG === 'true';
  const shouldDebug = debugMode || githubDebugEnabled;
  const level = shouldDebug ? 'debug' : 'info';

  loggerInstance = pino({
    base: null,
    level,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    initializeLogger();
  }
  return loggerInstance;
}
