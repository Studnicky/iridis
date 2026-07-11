import { RootCommand } from "./index.mjs";
import { Command } from "commander";

//#region src/commander.d.ts
declare function tab(instance: Command, completionConfig?: {
  completionCommandName?: string;
}): RootCommand;
//#endregion
export { tab as default };