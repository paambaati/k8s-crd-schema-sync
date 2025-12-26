import { tmpdir } from 'node:os';
import { mkdir, rm } from 'node:fs/promises';

export function stubFetch(fn: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
  const originalGlobalFetch = globalThis.fetch;
  // @ts-ignore -- We're overriding global fetch, but this is only for tests, so this is okay.
  globalThis.fetch = fn;

  return () => {
    globalThis.fetch = originalGlobalFetch;
  };
}

export async function withTempDir<T>(fn: (dir: string) => Promise<T> | T) {
  const dir = `${tmpdir()}/kcss-test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  try {
    await mkdir(dir, { recursive: true });
  } catch {}

  try {
    return await fn(dir);
  } finally {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {}
  }
}

export function isIntegrationRun() {
  return process.env.RUN_INTEGRATION === 'true';
}
