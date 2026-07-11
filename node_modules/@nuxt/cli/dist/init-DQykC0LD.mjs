import { o as logLevelArgs, t as cwdArgs } from "./_shared-B6XhZQ-m.mjs";
import { n as logger } from "./logger-C1qVsppt.mjs";
import { n as themeColor, t as nuxtIcon } from "./ascii-B6JJ3B2W.mjs";
import { r as relativeToProcess } from "./kit-BzPscsEd.mjs";
import { t as getNuxtVersion } from "./versions-B2QWOmP3.mjs";
import { t as runCommand$1 } from "./run-Bk6AOWq7.mjs";
import { r as fetchModules, t as checkNuxtCompatibility } from "./_utils-CPnqgoPN.mjs";
import add_default, { t as selectModulesAutocomplete } from "./add-nj6hd6cc.mjs";
import process from "node:process";
import { defineCommand, showUsage } from "citty";
import { colors } from "consola/utils";
import { hasTTY } from "std-env";
import { box, cancel, confirm, intro, isCancel, outro, select, spinner, tasks, text } from "@clack/prompts";
import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "pathe";
import { findFile, readPackageJSON, writePackageJSON } from "pkg-types";
import { x } from "tinyexec";
import { detectPackageManager, installDependencies } from "nypm";
import { downloadTemplate, startShell } from "giget";
import { $fetch } from "ofetch";
//#region ../nuxi/src/utils/starter-templates.ts
const hiddenTemplates = [
	"doc-driven",
	"v4",
	"v4-compat",
	"v2-bridge",
	"v3",
	"ui-vue",
	"module-devtools",
	"layer",
	"hub"
];
const fetchOptions = {
	timeout: 3e3,
	responseType: "json",
	headers: {
		"user-agent": "@nuxt/cli",
		...process.env.GITHUB_TOKEN ? { authorization: `token ${process.env.GITHUB_TOKEN}` } : {}
	}
};
let templatesCache = null;
async function getTemplates() {
	templatesCache ||= fetchTemplates();
	return templatesCache;
}
async function fetchTemplates() {
	const templates = {};
	const files = await $fetch("https://api.github.com/repos/nuxt/starter/contents/templates?ref=templates", fetchOptions);
	await Promise.all(files.map(async (file) => {
		if (!file.download_url || file.type !== "file" || !file.name.endsWith(".json")) return;
		const templateName = file.name.replace(".json", "");
		if (hiddenTemplates.includes(templateName)) return;
		templates[templateName] = void 0;
		templates[templateName] = await $fetch(file.download_url, fetchOptions);
	}));
	return templates;
}
//#endregion
//#region ../nuxi/src/commands/init.ts
const NON_WORD_RE = /[^\w-]/g;
const MULTI_DASH_RE = /-{2,}/g;
const LEADING_TRAILING_DASH_RE = /^-|-$/g;
const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/nuxt/starter/templates/templates";
const DEFAULT_TEMPLATE_NAME = "minimal";
const packageManagerOptions = Object.keys({
	npm: void 0,
	pnpm: void 0,
	yarn: void 0,
	bun: void 0,
	deno: void 0,
	aube: void 0
});
const nonInteractiveRequiredArgs = [
	"dir",
	"template",
	"packageManager",
	"gitInit"
];
const ARG_ERROR_EXIT_CODE = 2;
/**
* Report missing arguments in non-interactive mode. Centralises the message so
* the upfront check and the post-detection package-manager check stay in sync.
* Pass `availableTemplates` to also list the templates the user can choose from
* (when `--template` is missing). Callers are expected to `process.exit` after.
*/
async function reportMissingNonInteractiveArgs(cmd, missingArgs, availableTemplates) {
	await showUsage(cmd);
	if (availableTemplates) logger.info(`Available templates:\n${Object.entries(availableTemplates).map(([name, data]) => `  ${colors.cyan(name)}${data ? ` – ${data.description}` : ""}`).join("\n")}`);
	const label = missingArgs.length === 1 ? "argument" : "arguments";
	logger.error(`Non-interactive terminal detected. Missing required ${label}: ${missingArgs.map((name) => colors.cyan(name === "dir" ? "<dir>" : `--${name}`)).join(", ")}`);
}
var init_default = defineCommand({
	meta: {
		name: "init",
		description: "Initialize a fresh project"
	},
	args: {
		...cwdArgs,
		...logLevelArgs,
		dir: {
			type: "positional",
			description: "Project directory",
			default: ""
		},
		template: {
			type: "string",
			alias: "t",
			description: "Template name"
		},
		force: {
			type: "boolean",
			alias: "f",
			description: "Override existing directory"
		},
		offline: {
			type: "boolean",
			description: "Force offline mode"
		},
		preferOffline: {
			type: "boolean",
			description: "Prefer offline mode"
		},
		install: {
			type: "boolean",
			default: true,
			description: "Skip installing dependencies"
		},
		gitInit: {
			type: "boolean",
			description: "Initialize git repository"
		},
		shell: {
			type: "boolean",
			description: "Start shell after installation in project directory"
		},
		packageManager: {
			type: "string",
			description: `Package manager choice (${packageManagerOptions.join(", ")})`
		},
		modules: {
			type: "string",
			required: false,
			description: "Nuxt modules to install (comma separated without spaces)",
			negativeDescription: "Skip module installation prompt",
			alias: "M"
		},
		nightly: {
			type: "string",
			description: "Use Nuxt nightly release channel (3x or latest)"
		}
	},
	async run(ctx) {
		if (ctx.args.packageManager && !packageManagerOptions.includes(ctx.args.packageManager)) {
			logger.error(`Invalid package manager: ${colors.cyan(ctx.args.packageManager)}. Choose one of ${packageManagerOptions.map((pm) => colors.cyan(pm)).join(", ")}.`);
			process.exit(ARG_ERROR_EXIT_CODE);
		}
		if (!ctx.args.offline && !ctx.args.preferOffline && !ctx.args.template) getTemplates().catch(() => null);
		if (hasTTY) process.stdout.write(`\n${nuxtIcon}\n\n`);
		intro(colors.bold(`Welcome to Nuxt!`.split("").map((m) => `${themeColor}${m}`).join("")));
		let availableTemplates = {};
		if (!ctx.args.template || !ctx.args.dir) {
			const defaultTemplates = await import("./templates-B1n37AEd.mjs").then((r) => r.templates);
			if (ctx.args.offline || ctx.args.preferOffline) availableTemplates = defaultTemplates;
			else {
				const templatesSpinner = spinner();
				templatesSpinner.start("Loading available templates");
				try {
					availableTemplates = await getTemplates();
					templatesSpinner.stop("Templates loaded");
				} catch {
					availableTemplates = defaultTemplates;
					templatesSpinner.stop("Templates loaded from cache");
				}
			}
		}
		const isNonInteractive = !hasTTY;
		if (isNonInteractive) {
			const missingArgs = nonInteractiveRequiredArgs.filter((name) => {
				if (name === "packageManager") {
					if (ctx.args.template) return false;
					return !packageManagerOptions.includes(ctx.args.packageManager);
				}
				return ctx.args[name] === void 0 || ctx.args[name] === "";
			});
			if (missingArgs.length > 0) {
				await reportMissingNonInteractiveArgs(ctx.cmd, [...missingArgs], ctx.args.template ? void 0 : availableTemplates);
				process.exit(ARG_ERROR_EXIT_CODE);
			}
		}
		let templateName = ctx.args.template;
		if (!templateName) {
			const result = await select({
				message: "Which template would you like to use?",
				options: Object.entries(availableTemplates).map(([name, data]) => {
					return {
						value: name,
						label: data ? `${colors.whiteBright(name)} – ${data.description}` : name,
						hint: name === DEFAULT_TEMPLATE_NAME ? "recommended" : void 0
					};
				}),
				initialValue: DEFAULT_TEMPLATE_NAME
			});
			if (isCancel(result)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			templateName = result;
		}
		templateName ||= DEFAULT_TEMPLATE_NAME;
		if (typeof templateName !== "string") {
			logger.error("Please specify a template!");
			process.exit(1);
		}
		let dir = ctx.args.dir;
		if (dir === "") {
			const defaultDir = availableTemplates[templateName]?.defaultDir || "nuxt-app";
			const result = await text({
				message: "Where would you like to create your project?",
				placeholder: `./${defaultDir}`,
				defaultValue: defaultDir
			});
			if (isCancel(result)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			dir = result;
		}
		const cwd = resolve(ctx.args.cwd);
		let templateDownloadPath = resolve(cwd, dir);
		logger.step(`Creating project in ${colors.cyan(relativeToProcess(templateDownloadPath))}`);
		let shouldForce = Boolean(ctx.args.force);
		if (!shouldForce && existsSync(templateDownloadPath)) {
			if (isNonInteractive) {
				logger.error(`The directory ${colors.cyan(relativeToProcess(templateDownloadPath))} already exists. Pass ${colors.cyan("--force")} to override it or choose a different directory.`);
				process.exit(1);
			}
			const selectedAction = await select({
				message: `The directory ${colors.cyan(relativeToProcess(templateDownloadPath))} already exists. What would you like to do?`,
				options: [
					{
						value: "override",
						label: "Override its contents"
					},
					{
						value: "different",
						label: "Select different directory"
					},
					{
						value: "abort",
						label: "Abort"
					}
				]
			});
			if (isCancel(selectedAction)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			switch (selectedAction) {
				case "override":
					shouldForce = true;
					break;
				case "different": {
					const result = await text({ message: "Please specify a different directory:" });
					if (isCancel(result)) {
						cancel("Operation cancelled.");
						process.exit(1);
					}
					templateDownloadPath = resolve(cwd, result);
					break;
				}
				default: process.exit(1);
			}
		}
		let template;
		const downloadSpinner = spinner();
		downloadSpinner.start(`Downloading ${colors.cyan(templateName)} template`);
		try {
			template = await downloadTemplate(templateName, {
				dir: templateDownloadPath,
				force: shouldForce,
				offline: Boolean(ctx.args.offline),
				preferOffline: Boolean(ctx.args.preferOffline),
				registry: process.env.NUXI_INIT_REGISTRY || DEFAULT_REGISTRY
			});
			if (dir.length > 0) {
				const path = await findFile("package.json", {
					startingFrom: join(templateDownloadPath, "package.json"),
					reverse: true
				});
				if (path) {
					const pkg = await readPackageJSON(path, { try: true });
					if (pkg && pkg.name) {
						const slug = basename(templateDownloadPath).replace(NON_WORD_RE, "-").replace(MULTI_DASH_RE, "-").replace(LEADING_TRAILING_DASH_RE, "");
						if (slug) {
							pkg.name = slug;
							await writePackageJSON(path, pkg);
						}
					}
				}
			}
			downloadSpinner.stop(`Downloaded ${colors.cyan(template.name)} template`);
		} catch (err) {
			downloadSpinner.error("Template download failed");
			if (process.env.DEBUG) throw err;
			logger.error(String(err));
			process.exit(1);
		}
		if (ctx.args.nightly !== void 0 && !ctx.args.offline && !ctx.args.preferOffline) {
			const nightlySpinner = spinner();
			nightlySpinner.start("Fetching nightly version info");
			const response = await $fetch("https://registry.npmjs.org/nuxt-nightly");
			const nightlyChannelTag = ctx.args.nightly || "latest";
			if (!nightlyChannelTag) {
				nightlySpinner.error("Failed to get nightly channel tag");
				logger.error(`Error getting nightly channel tag.`);
				process.exit(1);
			}
			const nightlyChannelVersion = response["dist-tags"][nightlyChannelTag];
			if (!nightlyChannelVersion) {
				nightlySpinner.error("Nightly version not found");
				logger.error(`Nightly channel version for tag ${colors.cyan(nightlyChannelTag)} not found.`);
				process.exit(1);
			}
			const nightlyNuxtPackageJsonVersion = `npm:nuxt-nightly@${nightlyChannelVersion}`;
			const packageJsonPath = resolve(cwd, dir);
			const packageJson = await readPackageJSON(packageJsonPath);
			if (packageJson.dependencies && "nuxt" in packageJson.dependencies) packageJson.dependencies.nuxt = nightlyNuxtPackageJsonVersion;
			else if (packageJson.devDependencies && "nuxt" in packageJson.devDependencies) packageJson.devDependencies.nuxt = nightlyNuxtPackageJsonVersion;
			await writePackageJSON(join(packageJsonPath, "package.json"), packageJson);
			nightlySpinner.stop(`Updated to nightly version ${colors.cyan(nightlyChannelVersion)}`);
		}
		const currentPackageManager = detectCurrentPackageManager();
		const packageManagerArg = ctx.args.packageManager;
		const packageManagerSelectOptions = packageManagerOptions.map((pm) => ({
			label: pm,
			value: pm,
			hint: currentPackageManager === pm ? "current" : void 0
		}));
		const templatePackageManager = await detectTemplatePackageManager(template.dir);
		let selectedPackageManager;
		let skipInstallOnConflict = false;
		if (packageManagerOptions.includes(packageManagerArg)) {
			selectedPackageManager = packageManagerArg;
			if (templatePackageManager && templatePackageManager.name !== packageManagerArg) {
				skipInstallOnConflict = true;
				logger.warn(`The ${colors.cyan(template.name)} template is configured for ${colors.cyan(templatePackageManager.name)}, but ${colors.cyan(packageManagerArg)} was requested. Skipping dependency installation to avoid installing against ${colors.cyan(templatePackageManager.name)}'s lockfile and config. Reconcile the package manager (or use ${colors.cyan(templatePackageManager.name)}) and install manually.`);
			}
		} else if (templatePackageManager) {
			selectedPackageManager = templatePackageManager.name;
			const pinned = templatePackageManager.version ? `${templatePackageManager.name}@${templatePackageManager.version}` : templatePackageManager.name;
			logger.info(`Using ${colors.cyan(pinned)} as configured by the ${colors.cyan(template.name)} template.`);
		} else if (isNonInteractive) {
			await reportMissingNonInteractiveArgs(ctx.cmd, ["packageManager"]);
			process.exit(ARG_ERROR_EXIT_CODE);
		} else {
			const result = await select({
				message: "Which package manager would you like to use?",
				options: packageManagerSelectOptions,
				initialValue: currentPackageManager
			});
			if (isCancel(result)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			selectedPackageManager = result;
		}
		let gitInit = ctx.args.gitInit === "false" ? false : ctx.args.gitInit;
		if (gitInit === void 0) {
			const result = await confirm({ message: "Initialize git repository?" });
			if (isCancel(result)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			gitInit = result;
		}
		if (ctx.args.install === false || ctx.args.install === "false" || skipInstallOnConflict) {
			if (!skipInstallOnConflict) logger.info("Skipping install dependencies step.");
		} else {
			const setupTasks = [{
				title: `Installing dependencies with ${colors.cyan(selectedPackageManager)}`,
				task: async () => {
					await installDependencies({
						cwd: template.dir,
						packageManager: {
							name: selectedPackageManager,
							command: selectedPackageManager
						},
						silent: true
					});
					return "Dependencies installed";
				}
			}];
			if (gitInit) setupTasks.push({
				title: "Initializing git repository",
				task: async () => {
					try {
						await x("git", ["init", template.dir], {
							throwOnError: true,
							nodeOptions: { stdio: "inherit" }
						});
						return "Git repository initialized";
					} catch (err) {
						return `Git initialization failed: ${err}`;
					}
				}
			});
			try {
				await tasks(setupTasks);
			} catch (err) {
				if (process.env.DEBUG) throw err;
				logger.error(String(err));
				process.exit(1);
			}
		}
		const modulesToAdd = [];
		if (ctx.args.modules !== void 0) for (const segment of (ctx.args.modules || "").split(",")) {
			const mod = segment.trim();
			if (mod) modulesToAdd.push(mod);
		}
		else if (!ctx.args.offline && !ctx.args.preferOffline && !isNonInteractive) {
			const modulesPromise = fetchModules();
			const wantsUserModules = await confirm({
				message: `Would you like to browse and install modules?`,
				initialValue: false
			});
			if (isCancel(wantsUserModules)) {
				cancel("Operation cancelled.");
				process.exit(1);
			}
			if (wantsUserModules) {
				const modulesSpinner = spinner();
				modulesSpinner.start("Fetching available modules");
				const [response, templateDeps, nuxtVersion] = await Promise.all([
					modulesPromise,
					getTemplateDependencies(template.dir),
					getNuxtVersion(template.dir)
				]);
				modulesSpinner.stop("Modules loaded");
				const allModules = response.filter((module) => module.npm !== "@nuxt/devtools" && !templateDeps.includes(module.npm) && (!module.compatibility.nuxt || checkNuxtCompatibility(module, nuxtVersion)));
				if (allModules.length === 0) logger.info("All modules are already included in this template.");
				else {
					const result = await selectModulesAutocomplete({ modules: allModules });
					if (result.selected.length > 0) {
						const modules = result.selected;
						const { toInstall, skipped } = filterModules(modules, Object.fromEntries(await Promise.all(modules.map(async (module) => [module, await getModuleDependencies(module)]))));
						if (skipped.length) logger.info(`The following modules are already included as dependencies of another module and will not be installed: ${skipped.map((m) => colors.cyan(m)).join(", ")}`);
						modulesToAdd.push(...toInstall);
					}
				}
			}
		}
		if (modulesToAdd.length > 0) await runCommand$1(add_default, [
			...modulesToAdd,
			`--cwd=${templateDownloadPath}`,
			ctx.args.install && !skipInstallOnConflict ? "" : "--skipInstall",
			ctx.args.logLevel ? `--logLevel=${ctx.args.logLevel}` : ""
		].filter(Boolean));
		outro(`✨ Nuxt project has been created with the ${colors.cyan(template.name)} template.`);
		const relativeTemplateDir = relative(process.cwd(), template.dir) || ".";
		const runCmd = selectedPackageManager === "deno" ? "task" : "run";
		box(`\n${[!ctx.args.shell && relativeTemplateDir.length > 1 && colors.cyan(`cd ${relativeTemplateDir}`), colors.cyan(`${selectedPackageManager} ${runCmd} dev`)].filter(Boolean).map((step) => ` › ${step}`).join("\n")}\n`, ` 👉 Next steps `, {
			contentAlign: "left",
			titleAlign: "left",
			width: "auto",
			titlePadding: 2,
			contentPadding: 2,
			rounded: true,
			withGuide: false,
			formatBorder: (text) => `${themeColor + text}\x1B[0m`
		});
		if (ctx.args.shell) startShell(template.dir);
	}
});
async function getModuleDependencies(moduleName) {
	try {
		const dependencies = (await $fetch(`https://registry.npmjs.org/${moduleName}/latest`)).dependencies || {};
		return Object.keys(dependencies);
	} catch (err) {
		logger.warn(`Could not get dependencies for ${colors.cyan(moduleName)}: ${err}`);
		return [];
	}
}
function filterModules(modules, allDependencies) {
	const result = {
		toInstall: [],
		skipped: []
	};
	for (const module of modules) if (modules.some((otherModule) => {
		if (otherModule === module) return false;
		return (allDependencies[otherModule] || []).includes(module);
	})) result.skipped.push(module);
	else result.toInstall.push(module);
	return result;
}
async function getTemplateDependencies(templateDir) {
	try {
		const packageJsonPath = join(templateDir, "package.json");
		if (!existsSync(packageJsonPath)) return [];
		const packageJson = await readPackageJSON(packageJsonPath);
		const directDeps = {
			...packageJson.dependencies,
			...packageJson.devDependencies
		};
		const directDepNames = Object.keys(directDeps);
		const allDeps = new Set(directDepNames);
		(await Promise.all(directDepNames.map((dep) => getModuleDependencies(dep)))).forEach((deps) => {
			deps.forEach((dep) => allDeps.add(dep));
		});
		return [...allDeps];
	} catch (err) {
		logger.warn(`Could not read template dependencies: ${err}`);
		return [];
	}
}
/**
* Detect the package manager a template pins, scoped to the template directory
* (so we don't pick up the parent project's setup) via its lockfile, marker
* files or `packageManager` field. Returns `undefined` when the template pins
* none, in which case it is package-manager agnostic and the user is free to
* pick any. Detection errors are treated as "no pin".
*/
async function detectTemplatePackageManager(templateDir) {
	const detected = await detectPackageManager(templateDir, {
		includeParentDirs: false,
		ignoreArgv: true
	}).catch(() => void 0);
	if (!detected) return;
	return {
		name: detected.name,
		version: detected.version
	};
}
function detectCurrentPackageManager() {
	const userAgent = process.env.npm_config_user_agent;
	if (!userAgent) return;
	const [name] = userAgent.split("/");
	if (packageManagerOptions.includes(name)) return name;
}
//#endregion
export { init_default as default, detectTemplatePackageManager };
