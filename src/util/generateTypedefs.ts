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
} from "@babel/types";
import { capitaliseFirstLetter } from "../command";

const generateTypedefString = (allAttributes: Attributes) => {
  let expressions: TSPropertySignature[] = [];
  let spreadExpression: TSPropertySignature[] = [];

  if (allAttributes.spreadAttrs) {
    spreadExpression = allAttributes.spreadAttrs.map(
      // @ts-expect-error
      a => tsPropertySignature(identifier(a.argument.name as string),
        tsTypeAnnotation(tSUnknownKeyword()))
    )
  }

  if (allAttributes.attrs) {
    expressions = allAttributes.attrs.map(
      a => {
        const typeofAttr = typeof (a.value as StringLiteral).value
        const tsName = { type: `TS${capitaliseFirstLetter(typeofAttr)}Keyword` } as TSType

        return tsPropertySignature(identifier((a.name as JSXIdentifier).name), tsTypeAnnotation(tsName))
      })
  }

  return expressions.concat(spreadExpression)
};

export const generateTypedef = (
  componentName: string,
  otherAttrs?: Attributes
) => {
  if (!otherAttrs) return ''

  const typeLiteralMembers = generateTypedefString(otherAttrs)

  return generate(
    tsTypeAliasDeclaration(identifier(`${componentName}Props`), null, tsTypeLiteral(typeLiteralMembers))
  ).code;
};
