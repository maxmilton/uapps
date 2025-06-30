/* oxlint-disable no-return-assign */

let gitRefCache: string | undefined;
let gitHashCache: string | undefined;
let isDirtyCache: boolean | undefined;
let fromClosestTagCache: number | undefined;
let branchNameCache: string | undefined;

/**
 * Get the HEAD git reference via [git describe](https://git-scm.com/docs/git-describe).
 *
 * @returns A human readable git reference.
 */
export function gitRef(): string {
  return (gitRefCache ??= Bun.spawnSync(["git", "describe", "--always", "--dirty=-dev", "--broken"])
    .stdout.toString()
    .trim());
}

/**
 * Get the HEAD commit hash.
 *
 * @param long - Get the full git hash instead of a short hash in the form of
 * the first 7 characters (default `false`).
 * @returns A git commit hash string.
 */
export function gitHash(long?: boolean): string {
  return (gitHashCache ??= Bun.spawnSync(["git", "rev-parse", long ? "" : "--short", "HEAD"])
    .stdout.toString()
    .trim());
}

/**
 * Detect git tree dirty state (uncommitted changes).
 *
 * @returns The dirty state e.g., `true` when there are uncommitted changes.
 */
export function isDirty(): boolean {
  return (isDirtyCache ??= Bun.spawnSync(["git", "diff", "--quiet"]).exitCode !== 0);
}

/**
 * Get the number of commits from the closest tagged commit to the HEAD commit.
 *
 * Note: Unix only due to shell command substitution.
 *
 * @returns The number of commits from closest tag to HEAD or NaN when error.
 */
export function fromClosestTag(): number {
  return (fromClosestTagCache ??= Number(
    Bun.spawnSync(["sh", "-c", "git rev-list $(git describe --abbrev=0)..HEAD --count"])
      .stdout.toString()
      .trim(),
  ));
}

/**
 * Get the HEAD branch name.
 *
 * @returns The branch name or an empty string when error.
 */
export function branchName(): string {
  return (branchNameCache ??= Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    .stdout.toString()
    .trim());
}
