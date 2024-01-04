let gitHashCache: string | undefined;
let isDirtyCache: boolean | undefined;

export function gitHash(): string {
  // eslint-disable-next-line no-return-assign
  return (gitHashCache ??= Bun.spawnSync([
    'git',
    'rev-parse',
    '--short',
    'HEAD',
  ])
    .stdout.toString()
    .trim());
}

export function isDirty(): boolean {
  // eslint-disable-next-line no-return-assign
  return (isDirtyCache ??= !!Bun.spawnSync(['git', 'status', '--porcelain'])
    .stdout.toString()
    .trim());
}
