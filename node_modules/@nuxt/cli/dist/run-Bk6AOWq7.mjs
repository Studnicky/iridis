import process from "node:process";
import { runCommand } from "citty";
import { fileURLToPath } from "node:url";
//#region ../nuxi/src/commands/_utils.ts
const nuxiCommands = [
	"add",
	"add-template",
	"analyze",
	"build",
	"cleanup",
	"_dev",
	"dev",
	"devtools",
	"generate",
	"info",
	"init",
	"module",
	"prepare",
	"preview",
	"start",
	"test",
	"typecheck",
	"upgrade"
];
function isNuxiCommand(command) {
	return nuxiCommands.includes(command);
}
//#endregion
//#region ../nuxi/src/run.ts
globalThis.__nuxt_cli__ = globalThis.__nuxt_cli__ || {
	startTime: Date.now(),
	entry: fileURLToPath(new URL("../../bin/nuxi.mjs", import.meta.url)),
	devEntry: fileURLToPath(new URL("../dev/index.mjs", import.meta.url))
};
async function runCommand$1(command, argv = process.argv.slice(2), data = {}) {
	argv.push("--no-clear");
	if (command.meta && "name" in command.meta && typeof command.meta.name === "string") {
		const name = command.meta.name;
		if (!isNuxiCommand(name)) throw new Error(`Invalid command ${name}`);
	} else throw new Error(`Invalid command, must be named`);
	return await runCommand(command, {
		rawArgs: argv,
		data: { overrides: data.overrides || {} }
	});
}
//#endregion
export { runCommand$1 as t };
