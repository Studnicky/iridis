import { o as logLevelArgs, t as cwdArgs } from "./_shared-B6XhZQ-m.mjs";
import { n as logger } from "./logger-C1qVsppt.mjs";
import { r as relativeToProcess } from "./kit-BzPscsEd.mjs";
import { colors } from "consola/utils";
import { confirm, isCancel } from "@clack/prompts";
import { existsSync } from "node:fs";
import { resolve } from "pathe";
import { satisfies } from "semver";
import { $fetch } from "ofetch";
import { parseINI } from "confbox";
//#region ../nuxi/src/commands/module/_utils.ts
async function fetchModules() {
	const { modules } = await $fetch(`https://api.nuxt.com/modules?version=all`);
	return modules;
}
function checkNuxtCompatibility(module, nuxtVersion) {
	if (!module.compatibility?.nuxt) return true;
	return satisfies(nuxtVersion, module.compatibility.nuxt, { includePrerelease: true });
}
function getRegistryFromContent(content, scope) {
	try {
		const npmConfig = parseINI(content);
		if (scope) {
			const scopeKey = `${scope}:registry`;
			if (npmConfig[scopeKey]) return npmConfig[scopeKey].trim();
		}
		if (npmConfig.registry) return npmConfig.registry.trim();
		return null;
	} catch {
		return null;
	}
}
function getProjectDependencies(projectPkg) {
	return new Set([...Object.keys(projectPkg.dependencies || {}), ...Object.keys(projectPkg.devDependencies || {})]);
}
/**
* Warn and prompt to continue when the project has no `nuxt` dependency.
* Returns `false` if the user declines or cancels.
*/
async function ensureNuxtDependency(cwd, projectPkg) {
	if (projectPkg.dependencies?.nuxt || projectPkg.devDependencies?.nuxt) return true;
	logger.warn(`No ${colors.cyan("nuxt")} dependency detected in ${colors.cyan(relativeToProcess(cwd))}.`);
	const shouldContinue = await confirm({
		message: `Do you want to continue anyway?`,
		initialValue: false
	});
	return !isCancel(shouldContinue) && shouldContinue === true;
}
function isPnpmWorkspace(packageManager, cwd) {
	return packageManager?.name === "pnpm" && existsSync(resolve(cwd, "pnpm-workspace.yaml"));
}
/** Forward `cwd` and log-level args to a chained command invocation. */
function forwardCommandArgs(args) {
	return Object.entries(args).filter(([k]) => k in cwdArgs || k in logLevelArgs).map(([k, v]) => `--${k}=${v}`);
}
//#endregion
export { getProjectDependencies as a, forwardCommandArgs as i, ensureNuxtDependency as n, getRegistryFromContent as o, fetchModules as r, isPnpmWorkspace as s, checkNuxtCompatibility as t };
