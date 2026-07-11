import { o as logLevelArgs, t as cwdArgs } from "./_shared-B6XhZQ-m.mjs";
import { n as logger } from "./logger-C1qVsppt.mjs";
import { r as relativeToProcess } from "./kit-BzPscsEd.mjs";
import { t as runCommand$1 } from "./run-Bk6AOWq7.mjs";
import { a as getProjectDependencies, i as forwardCommandArgs, n as ensureNuxtDependency, r as fetchModules, s as isPnpmWorkspace } from "./_utils-CPnqgoPN.mjs";
import { t as prepare_default } from "./prepare-Dg6Tsv5Z.mjs";
import process from "node:process";
import { defineCommand } from "citty";
import { colors } from "consola/utils";
import { cancel, confirm, isCancel, multiselect } from "@clack/prompts";
import { resolve } from "pathe";
import { readPackageJSON } from "pkg-types";
import { detectPackageManager, removeDependency } from "nypm";
import { updateConfig } from "c12/update";
//#region ../nuxi/src/commands/module/remove.ts
var remove_default = defineCommand({
	meta: {
		name: "remove",
		description: "Remove Nuxt modules"
	},
	args: {
		...cwdArgs,
		...logLevelArgs,
		moduleName: {
			type: "positional",
			description: "Specify one or more modules to remove by name, separated by spaces",
			required: false
		},
		skipInstall: {
			type: "boolean",
			description: "Skip dependency uninstall"
		},
		skipConfig: {
			type: "boolean",
			description: "Skip nuxt.config.ts update"
		}
	},
	async setup(ctx) {
		const cwd = resolve(ctx.args.cwd);
		const modules = ctx.args._.map((e) => e.trim()).filter(Boolean);
		const projectPkg = await readPackageJSON(cwd).catch(() => ({}));
		if (!await ensureNuxtDependency(cwd, projectPkg)) process.exit(1);
		if (ctx.args.skipConfig && modules.length === 0) {
			cancel(`Specify one or more modules to remove when ${colors.cyan("--skipConfig")} is set.`);
			process.exit(1);
		}
		const installedNames = getProjectDependencies(projectPkg);
		const modulesDB = modules.some((m) => !installedNames.has(m)) ? await fetchModules().catch((err) => {
			logger.warn(`Cannot search in the Nuxt Modules database: ${err}`);
			return [];
		}) : [];
		const resolvedModules = modules.map((m) => resolveModuleName(m, modulesDB, installedNames));
		if (resolvedModules.length > 0) logger.info(`Resolved ${resolvedModules.map((x) => colors.cyan(x)).join(", ")}, removing module${resolvedModules.length > 1 ? "s" : ""}...`);
		if (!await removeModules(resolvedModules, {
			...ctx.args,
			cwd
		}, projectPkg)) process.exit(0);
		if (!ctx.args.skipInstall) await runCommand$1(prepare_default, forwardCommandArgs(ctx.args));
	}
});
async function removeModules(modules, { skipInstall = false, skipConfig = false, cwd }, projectPkg) {
	const removedFromConfig = [];
	if (!skipConfig) {
		let configMissing = false;
		let cancelled = false;
		await updateConfig({
			cwd,
			configFile: "nuxt.config",
			onCreate() {
				configMissing = true;
				return false;
			},
			async onUpdate(config) {
				if (!Array.isArray(config.modules)) return;
				const present = [];
				for (const item of config.modules) {
					const name = readModuleName(item);
					if (name) present.push(name);
				}
				let toRemove;
				if (modules.length === 0) {
					if (present.length === 0) return;
					const picked = await multiselect({
						message: "Select modules to remove:",
						options: present.map((m) => ({
							value: m,
							label: m
						})),
						required: true
					});
					if (isCancel(picked)) {
						cancelled = true;
						return;
					}
					toRemove = new Set(picked);
				} else toRemove = new Set(modules);
				for (let i = config.modules.length - 1; i >= 0; i--) {
					const name = readModuleName(config.modules[i]);
					if (name && toRemove.has(name)) {
						logger.info(`Removing ${colors.cyan(name)} from the ${colors.cyan("modules")}`);
						config.modules.splice(i, 1);
						removedFromConfig.push(name);
					}
				}
			}
		}).catch((error) => {
			if (configMissing) return;
			logger.error(`Failed to update ${colors.cyan("nuxt.config")}: ${error.message}`);
			logger.error(`Please manually remove ${colors.cyan(modules.join(", ") || "the relevant modules")} from the ${colors.cyan("modules")} array in ${colors.cyan("nuxt.config.ts")}`);
		});
		if (cancelled) {
			cancel("No modules selected.");
			return false;
		}
		if (modules.length === 0 && removedFromConfig.length === 0) {
			cancel(configMissing ? `No ${colors.cyan("nuxt.config")} found in ${colors.cyan(relativeToProcess(cwd))}.` : `No modules configured in ${colors.cyan("nuxt.config")}.`);
			return false;
		}
	}
	if (!skipInstall) {
		const installedModules = [];
		const notInstalledModules = [];
		const dependencies = getProjectDependencies(projectPkg);
		const targets = Array.from(new Set([...modules, ...removedFromConfig]));
		for (const module of targets) if (dependencies.has(module)) installedModules.push(module);
		else notInstalledModules.push(module);
		if (notInstalledModules.length > 0) {
			const notInstalledList = notInstalledModules.map((m) => colors.cyan(m)).join(", ");
			const are = notInstalledModules.length > 1 ? "are" : "is";
			logger.info(`${notInstalledList} ${are} not installed as a dependency`);
		}
		if (installedModules.length === 0) return true;
		const toRemove = [...installedModules];
		const orphanedPeers = await findOrphanedPeers(installedModules, projectPkg, cwd);
		if (orphanedPeers.length > 0) {
			const peersList = orphanedPeers.map(({ peer, source }) => `${colors.cyan(peer)} (peer of ${colors.cyan(source)})`).join(", ");
			const peerDep = orphanedPeers.length > 1 ? "dependencies" : "dependency";
			const them = orphanedPeers.length > 1 ? "them" : "it";
			logger.info(`The following peer ${peerDep} ${orphanedPeers.length > 1 ? "are" : "is"} no longer used by any other dependency: ${peersList}`);
			const alsoRemove = await confirm({
				message: `Do you also want to remove ${them}?`,
				initialValue: false
			});
			if (isCancel(alsoRemove)) {
				cancel("Aborted.");
				return false;
			}
			if (alsoRemove) toRemove.push(...orphanedPeers.map((o) => o.peer));
		}
		const removeList = toRemove.map((m) => colors.cyan(m)).join(", ");
		const dependency = toRemove.length > 1 ? "dependencies" : "dependency";
		logger.info(`Uninstalling ${removeList} ${dependency}`);
		const packageManager = await detectPackageManager(cwd);
		if (!await removeDependency(toRemove, {
			cwd,
			packageManager,
			workspace: isPnpmWorkspace(packageManager, cwd)
		}).then(() => true).catch((error) => {
			logger.error(String(error));
			return false;
		})) return false;
	}
	return true;
}
function readModuleName(item) {
	if (typeof item === "string") return item;
	if (Array.isArray(item) && typeof item[0] === "string") return item[0];
	return null;
}
function resolveModuleName(input, modulesDB, installed) {
	if (installed.has(input)) return input;
	return modulesDB.find((m) => m.name === input || m.npm === input || m.aliases?.includes(input))?.npm || input;
}
async function findOrphanedPeers(removing, projectPkg, cwd) {
	const projectDeps = getProjectDependencies(projectPkg);
	const removingSet = new Set(removing);
	const candidates = /* @__PURE__ */ new Map();
	for (const m of removing) {
		const pkg = await readPackageJSON(m, { from: cwd }).catch(() => null);
		if (!pkg?.peerDependencies) continue;
		for (const peer of Object.keys(pkg.peerDependencies)) {
			if (!projectDeps.has(peer) || removingSet.has(peer) || candidates.has(peer)) continue;
			candidates.set(peer, m);
		}
	}
	if (candidates.size === 0) return [];
	const stillNeeded = /* @__PURE__ */ new Set();
	for (const dep of projectDeps) {
		if (removingSet.has(dep) || candidates.has(dep)) continue;
		const depPkg = await readPackageJSON(dep, { from: cwd }).catch(() => null);
		if (!depPkg) continue;
		const depDeps = new Set([...Object.keys(depPkg.dependencies || {}), ...Object.keys(depPkg.peerDependencies || {})]);
		for (const peer of candidates.keys()) if (depDeps.has(peer)) stillNeeded.add(peer);
	}
	const orphans = [];
	for (const [peer, source] of candidates) if (!stillNeeded.has(peer)) orphans.push({
		peer,
		source
	});
	return orphans;
}
//#endregion
export { remove_default as default };
