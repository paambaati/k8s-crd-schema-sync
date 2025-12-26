import { test, expect } from 'bun:test';
import { parseGitHubRepo } from '../../src/github-manager';

test('parseGitHubRepo parses owner and repo', () => {
  const parsed = parseGitHubRepo('owner/repo');
  expect(parsed.owner, 'owner should be parsed correctly').toBe('owner');
  expect(parsed.repo, 'repo should be parsed correctly').toBe('repo');
});

test('parseGitHubRepo throws on invalid format', () => {
  expect(() => parseGitHubRepo('invalid'), 'invalid format should throw').toThrow();
});
