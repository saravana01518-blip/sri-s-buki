/**
 * Normalizes a base URL by trimming whitespace and stripping trailing slashes.
 */
function normalizeBaseUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\/+$/, '');
}

/**
 * Joins a base URL and a relative path without producing duplicate slashes.
 */
function joinUrl(baseUrl, routePath = '') {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const cleanPath = String(routePath || '').trim().replace(/^\/+/, '');
  if (!normalizedBase) {
    return cleanPath ? `/${cleanPath}` : '';
  }
  return cleanPath ? `${normalizedBase}/${cleanPath}` : normalizedBase;
}

module.exports = {
  normalizeBaseUrl,
  joinUrl,
};
