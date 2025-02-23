export const parseKontiDimensions = (name) => {
  const matches = name.match(/(\d+)\s*x\s*(\d+)/);
  if (matches) {
    return {
      width: parseInt(matches[1], 10),
      height: parseInt(matches[2], 10)
    };
  }
  return null;
};