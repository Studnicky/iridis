import { getTypescriptImport } from './get-typescript-import.js'
import * as path from 'node:path'
import * as fs from 'node:fs'
/**
 * Cache mapping directories to their nearest tsconfig file path. Speeds up
 * config resolution for files in the same directory.
 */
var directoryCacheByPath = /* @__PURE__ */ new Map()
/**
 * Cache mapping file paths to their parsed tsconfig content. Prevents
 * re-parsing the same config files multiple times.
 */
var contentCacheByPath = /* @__PURE__ */ new Map()
/**
 * Finds and parses the closest tsconfig.json file in the directory hierarchy.
 *
 * Searches upward from the file's directory until finding a tsconfig file or
 * reaching the configured root directory. Results are cached for performance.
 *
 * @param options - Configuration options.
 * @param options.tsconfigFilename - Name of the config file to search for
 *   (e.g., 'tsconfig.json').
 * @param options.tsconfigRootDir - Root directory to stop searching at.
 * @param options.contextCwd - Current working directory for module resolution.
 * @param options.filePath - Path of the file to find config for.
 * @returns Parsed TypeScript configuration or null if TypeScript is
 *   unavailable.
 * @throws {Error} If no tsconfig file is found within the root directory.
 */
function readClosestTsConfigByPath({
  tsconfigFilename,
  tsconfigRootDir,
  contextCwd,
  filePath,
}) {
  let typescriptImport = getTypescriptImport()
  if (!typescriptImport) {
    return null
  }
  let directory = path.dirname(filePath)
  let checkedDirectories = [directory]
  do {
    let tsconfigPath = path.join(directory, tsconfigFilename)
    let cachedDirectory = directoryCacheByPath.get(directory)
    if (!cachedDirectory && fs.existsSync(tsconfigPath)) {
      cachedDirectory = tsconfigPath
    }
    if (cachedDirectory) {
      for (let checkedDirectory of checkedDirectories) {
        directoryCacheByPath.set(checkedDirectory, cachedDirectory)
      }
      return getCompilerOptions(typescriptImport, contextCwd, cachedDirectory)
    }
    directory = path.dirname(directory)
    checkedDirectories.push(directory)
  } while (directory.length > 1 && directory.length >= tsconfigRootDir.length)
  throw new Error(
    `Couldn't find any ${tsconfigFilename} relative to '${filePath}' within '${tsconfigRootDir}'.`,
  )
}
/**
 * Parses a TypeScript configuration file and extracts compiler options.
 *
 * Reads and validates the tsconfig file, then creates a module resolution cache
 * for efficient import resolution. Results are cached to avoid re-parsing.
 *
 * @param typescriptImport - TypeScript library import.
 * @param contextCwd - Current working directory for resolution.
 * @param filePath - Path to the tsconfig file to parse.
 * @returns Parsed compiler options and resolution cache.
 * @throws {Error} If the config file cannot be read or parsed.
 */
function getCompilerOptions(typescriptImport, contextCwd, filePath) {
  if (contentCacheByPath.has(filePath)) {
    return contentCacheByPath.get(filePath)
  }
  let configFileRead = typescriptImport.readConfigFile(
    filePath,
    typescriptImport.sys.readFile,
  )
  if (configFileRead.error) {
    throw new Error(
      `Error reading tsconfig file: ${JSON.stringify(configFileRead.error)}`,
    )
  }
  let parsedContent = typescriptImport.parseJsonConfigFileContent(
    configFileRead,
    typescriptImport.sys,
    path.dirname(filePath),
  )
  let compilerOptionsConverted =
    typescriptImport.convertCompilerOptionsFromJson(
      parsedContent.raw.config.compilerOptions,
      path.dirname(filePath),
    )
  if (compilerOptionsConverted.errors.length > 0) {
    throw new Error(
      `Error getting compiler options: ${JSON.stringify(compilerOptionsConverted.errors)}`,
    )
  }
  let cache = typescriptImport.createModuleResolutionCache(
    contextCwd,
    fileName => typescriptImport.sys.resolvePath(fileName),
    compilerOptionsConverted.options,
  )
  let output = {
    compilerOptions: compilerOptionsConverted.options,
    cache,
  }
  contentCacheByPath.set(filePath, output)
  return output
}
export { contentCacheByPath, directoryCacheByPath, readClosestTsConfigByPath }
