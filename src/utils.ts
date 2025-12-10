/**
 * Utility functions for the CRD schema sync tool
 */

/**
 * Expand `~` in file paths to the user's home directory.
 */
export function expandUser(path: string): string {
  if (path.startsWith('~')) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
      return path;
    }
    return path.replace(/^~/, home);
  }
  return path;
}
