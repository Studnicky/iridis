import { createRequire } from 'node:module'
/**
 * Cached reference to the TypeScript module.
 */
var cachedImport
/**
 * Indicates whether an attempt to load the TypeScript module has already been
 * made.
 */
var hasTriedLoadingTypescript = false
/**
 * Dynamically loads the typescript module if it's available and caches it.
 *
 * @returns The TypeScript module or null if it's not available.
 */
function getTypescriptImport() {
  if (cachedImport) {
    return cachedImport
  }
  if (hasTriedLoadingTypescript) {
    return null
  }
  hasTriedLoadingTypescript = true
  try {
    cachedImport = createRequire(import.meta.url)('typescript')
  } catch (_error) {
    return null
  }
  return cachedImport
}
export { getTypescriptImport }
