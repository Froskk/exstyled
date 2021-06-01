import {
  CodeAction,
  CodeActionProvider as BaseCodeActionProvider,
  Command,
  ProviderResult,
  Range,
  Selection,
  TextDocument,
  workspace,
} from 'vscode';

import { COMMAND_NAME, EXTENSION_NAME } from './command';

export class CodeActionProvider implements BaseCodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range | Selection
  ): ProviderResult<(Command | CodeAction)[]> {
    const currentLineText = document.lineAt(range.start.line).text.trim();

    if (currentLineText.startsWith('<') || currentLineText.endsWith('>')) {
      const cmd = new CodeAction('✨ Extract styled component');
      cmd.command = { command: COMMAND_NAME, title: EXTENSION_NAME };
      cmd.isPreferred = true;

      return [cmd];
    }

    return;
  }
}
