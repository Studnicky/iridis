import { defineCommand } from "citty";
//#region ../nuxi/src/commands/module/index.ts
var module_default = defineCommand({
	meta: {
		name: "module",
		description: "Manage Nuxt modules"
	},
	args: {},
	subCommands: {
		add: () => import("./add-nj6hd6cc.mjs").then((r) => r.default || r),
		remove: () => import("./remove-DOrZ78y2.mjs").then((r) => r.default || r),
		search: () => import("./search-Dl8jB_vb.mjs").then((r) => r.default || r)
	}
});
//#endregion
export { module_default as default };
