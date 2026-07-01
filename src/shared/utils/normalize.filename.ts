export const normalizeFilename = (name: string) => {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
};
