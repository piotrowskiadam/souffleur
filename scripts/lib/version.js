export function compareVersions(left, right) {
  const parse = value => {
    if (!/^\d+(?:\.\d+){0,3}$/.test(value)) throw new Error(`Invalid extension version: ${value}`);
    return value.split('.').map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 4; i++) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

