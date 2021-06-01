import { Attributes } from "./parseDocument";
import generate from "@babel/generator";
import {
  identifier,
  tsTypeAliasDeclaration,
  tsTypeLiteral,
  tsPropertySignature,
  TSPropertySignature,
  JSXIdentifier,
  tsTypeAnnotation,
  tSUnknownKeyword,
  TSType,
  StringLiteral,
  isFunction,
} from "@babel/types";
import { capitaliseFirstLetter } from "../command";
import { commands, Hover, Range, TextDocument } from "vscode";
import { findMatchIndexes } from "./findMatches";

const generateTypedefString = async (document: TextDocument, allAttributes: Attributes) => {
  let expressions: Promise<string>[] = [];
  let spreadExpression: Promise<string>[] = [];

  if (allAttributes.spreadAttrs) {
    spreadExpression = allAttributes.spreadAttrs.map(
      async a => {
        // @ts-expect-error
        const unknownSignature = `${a.argument.name}: unknown[];`;
        const pos = document.positionAt(a.argument.start ?? 0);
        const hover = await commands.executeCommand<Hover[]>('vscode.executeHoverProvider', document.uri, pos);
        const tsHoverContent = hover && hover
          // @ts-expect-error
          .reduce<string[]>((acc, val) => acc.concat(val.contents.map((x) => x.value)), [])
          .find((x) => x.includes('typescript'));

        if (!tsHoverContent) {
          return unknownSignature;
        }

        const indexes = findMatchIndexes(/\w+:/gm, tsHoverContent);
        const dirtyType = tsHoverContent.slice(indexes[0]);
        const cleanType = dirtyType.replace(/(`)/gm, '').replace(/\n+$/, '');

        return `\t${cleanType}`;
      }
    );
  }

  if (allAttributes.attrs) {
    expressions = (allAttributes.attrs.map(
      async a => {
        const unknownSignature = `${a.name.name}: unknown;`;

        const hover = await commands.executeCommand<Hover[]>('vscode.executeHoverProvider', document.uri, document.positionAt(a.start ?? 0));
        const tsHoverContent = hover && hover
          // @ts-expect-error
          .reduce<string[]>((acc, val) => acc.concat(val.contents.map((x) => x.value)), [])
          .find((x) => x.includes('typescript'));

        if (!tsHoverContent) {
          return unknownSignature;
        }

        const indexes = findMatchIndexes(/\)/gm, tsHoverContent);
        const dirtyType = tsHoverContent.slice(indexes[0] + 2);
        const cleanType = dirtyType.replace(/(`)/gm, '').replace(/\n+$/, '').replace(/\n/gm, '\n\t');

        return `\t${cleanType};`;
      }));
  }

  const expr = await Promise.all(expressions.concat(spreadExpression));

  return expr;
};

export const generateTypedef = async (
  document: TextDocument,
  componentName: string,
  otherAttrs?: Attributes
) => {
  if (!otherAttrs) {return '';}

  const typeLiteralMembers = await generateTypedefString(document, otherAttrs);
  const declaration = `type ${componentName}Props = {\n`;
  return declaration.concat(typeLiteralMembers.join('\n'), '\n}');
};
