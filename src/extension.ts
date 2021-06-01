import { commands, ExtensionContext, languages } from "vscode";
import { CodeActionProvider } from "./CodeActionProvider";
import { exstyledCommand, COMMAND_NAME } from "./command";

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(COMMAND_NAME, exstyledCommand),
		languages.registerCodeActionsProvider(
			["javascriptreact", "typescriptreact"],
			new CodeActionProvider()
		)
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
