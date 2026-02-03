const toNumericParts = (version) => {
  if (!version) return [];
  return String(version)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));
};

const compareVersions = (a, b) => {
  const partsA = toNumericParts(a);
  const partsB = toNumericParts(b);
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i += 1) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
};

module.exports = { compareVersions };
