function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTokenSearchQuery(search, fields, { maxTokens = 6 } = {}) {
  const query = String(search || '').trim();
  if (!query) return null;

  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, maxTokens);

  if (!tokens.length || !Array.isArray(fields) || fields.length === 0) return null;

  return {
    $and: tokens.map((token) => {
      const regex = new RegExp(escapeRegex(token), 'i');
      return {
        $or: fields.map((field) => ({ [field]: regex })),
      };
    }),
  };
}
