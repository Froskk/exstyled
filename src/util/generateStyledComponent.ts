import { Property, StyleAttribute } from "./parseDocument";
import generate from "@babel/generator";
import {
  variableDeclaration,
  variableDeclarator,
  identifier,
  taggedTemplateExpression,
  memberExpression,
  callExpression,
  templateLiteral,
  templateElement,
} from "@babel/types";

const camelCaseToKebabCase = (input: string) => {
  let output = "";
  for (let i = 0; i < input.length; i++) {
    if (input[i] === input[i].toUpperCase()) {
      output += "-" + input[i].toLowerCase();
      continue;
    }
    output += input[i];
  }

  return output;
};

const generateStyleBlock = (properties: Property[]) => {
  let stringifiedStyles = properties.map(prop => {
    return `  ${camelCaseToKebabCase(prop.key)}: ${prop.value}`;
  });

  return `\n${stringifiedStyles.join(";\n")};\n`;
};

export const generateStyledComponent = (
  elementName: string,
  componentName: string,
  styleAttr: StyleAttribute | null,
  withProps?: boolean
) => {
  const styleString = styleAttr !== null ? generateStyleBlock(styleAttr.properties) : "";

  const code = generate(
    variableDeclaration("const", [
      variableDeclarator(
        identifier(componentName),
        taggedTemplateExpression(
          // Is default tag? just concat with a '.', otherwise wrap with '()'
          elementName[0] === elementName[0].toLowerCase()
            ? memberExpression(identifier("styled"), identifier(elementName))
            : callExpression(identifier("styled"), [identifier(elementName)]),
          templateLiteral([templateElement({ raw: styleString })], [])
        )
      ),
    ])
  ).code;

  return withProps ? code.replace("\`", `<${componentName}Props>\``) : code;
};
