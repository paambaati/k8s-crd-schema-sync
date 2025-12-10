/**
 * GitHub integration for creating PRs and managing schemas
 */

import { Octokit } from '@octokit/rest';
import { CreateGitHubPROptions, GitHubConfig } from './types';

export class GitHubManager {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  /**
   * Check if a branch exists.
   */
  async branchExists(branchName: string): Promise<boolean> {
    try {
      await this.octokit.repos.getBranch({
        owner: this.config.owner,
        repo: this.config.repo,
        branch: branchName,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the SHA of the base branch tip.
   */
  async getBaseCommitSHA(): Promise<string> {
    const ref = await this.octokit.git.getRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `heads/${this.config.baseBranch}`,
    });

    return ref.data.object.sha;
  }

  /**
   * Create a new branch.
   */
  async createBranch(branchName: string, sha: string): Promise<void> {
    await this.octokit.git.createRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
  }

  /**
   * Delete a branch.
   */
  async deleteBranch(branchName: string): Promise<void> {
    await this.octokit.git.deleteRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: `heads/${branchName}`,
    });
  }

  /**
   * Get file content from repository.
   */
  async getFileContent(
    path: string,
    branch: string = this.config.baseBranch
  ): Promise<string | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref: branch,
      });

      if (Array.isArray(response.data)) {
        return null;
      }

      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create or update a file in the repository.
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    branch: string,
    message: string
  ): Promise<string> {
    let sha: string | undefined;

    const existing = await this.octokit.repos.getContent({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      ref: branch,
    });

    if (!Array.isArray(existing.data) && 'sha' in existing.data) {
      sha = existing.data.sha;
    }

    const response = await this.octokit.repos.createOrUpdateFileContents({
      owner: this.config.owner,
      repo: this.config.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      ...(sha && { sha }),
    });

    return response.data.commit.sha as string;
  }

  /**
   * Create a pull request.
   */
  async createPullRequest(title: string, body: string, headBranch: string): Promise<string> {
    const response = await this.octokit.pulls.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      body,
      head: headBranch,
      base: this.config.baseBranch,
    });

    return response.data.html_url;
  }

  /**
   * Create PR with multiple files.
   */
  async createPRWithFiles(options: CreateGitHubPROptions): Promise<string> {
    const exists = await this.branchExists(options.branchName);
    if (exists) {
      await this.deleteBranch(options.branchName);
    }

    const baseSHA = await this.getBaseCommitSHA();
    await this.createBranch(options.branchName, baseSHA);

    for (const [path, content] of Object.entries(options.files)) {
      await this.createOrUpdateFile(
        path,
        content,
        options.branchName,
        `chore: add/update schema ${path}`
      );
    }

    return this.createPullRequest(options.title, options.body, options.branchName);
  }
}

export function parseGitHubRepo(repo: string): { owner: string; repo: string } {
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('Invalid GitHub repository format. Expected: owner/repo');
  }
  return { owner, repo: repoName };
}
