import { tmpdir } from 'os';
import { mkdir, rm } from 'node:fs/promises';

export function stubFetch(fn: (input: RequestInfo, init?: RequestInit) => Promise<Response>) {
  const originalGlobalFetch = globalThis.fetch;
  // do not attempt to touch Bun.fetch (may be readonly)

  // override global fetch
  // @ts-ignore
  globalThis.fetch = fn;
  // don't attempt to override Bun.fetch (readonly); tests and code use global fetch now

  return () => {
    // restore global fetch
    // @ts-ignore
    globalThis.fetch = originalGlobalFetch;
    // don't attempt to restore Bun.fetch
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
