import { parse, ParserOptions } from "@babel/parser";
import traverse from "@babel/traverse";
import {
  JSXElement,
  File,
  JSXIdentifier,
  JSXAttribute,
  ObjectProperty,
  StringLiteral,
  JSXSpreadAttribute,
  Node,
} from "@babel/types";

const babelOptions: ParserOptions = {
  sourceType: "module",
  plugins: [
    "jsx",
    "typescript",
    ["decorators", { decoratorsBeforeExport: true }],
    "classProperties",
    "optionalChaining",
    "nullishCoalescingOperator",
  ],
};

export type Property = { key: string; value: string };

export type StyleAttribute = {
  start: number;
  end: number;
  properties: Property[];
}

export type Attributes = {
  attrs?: JSXAttribute[]
  spreadAttrs?: JSXSpreadAttribute[]
}

export type ProcessedAttrs = StyleAttribute & Attributes

const findTagAndInsertPosition = (file: File, offset: number) => {
  let parentDeclaration: Node | undefined = undefined;
  let selectedElement: JSXElement | undefined;
  let insertPosition: number = 0;
  let importStatementExisting = false;

  traverse(file, {
    JSXElement: enter => {
      if (enter.node.start === null || enter.node.start > offset) {
        return;
      }
      if (
        selectedElement === undefined ||
        enter.node.start > selectedElement.start!
      ) {
        const parentPath = enter.findParent(path => (path.isFunctionDeclaration() || path.isVariableDeclaration()))
        parentDeclaration = parentPath?.node
        selectedElement = enter.node;
      }
    },
    ImportDeclaration: enter => {
      // Just find last Import Statement
      if (enter.node.end !== null) {
        insertPosition = enter.node.end;
      }

      // Check wether 'styled' is already imported
      if (
        enter.node.specifiers.find(s => s.local.name === "styled") !== undefined
      ) {
        importStatementExisting = true;
      }
    },
  });

  const parentNode = parentDeclaration as Node | undefined

  return { selectedElement, insertPosition, importStatementExisting, parentNode };
};

const supportedValueTypes = [
  "StringLiteral",
  "NumericLiteral",
  "TemplateLiteral",
];

const getStyleAttribute = (element: JSXElement): StyleAttribute | null => {
  const styleAttr = element.openingElement.attributes.find(
    a => a.type === "JSXAttribute" && a.name.name === "style"
  ) as JSXAttribute | undefined;

  if (
    !styleAttr ||
    !styleAttr.value ||
    styleAttr.value.type !== "JSXExpressionContainer" ||
    styleAttr.value.expression.type !== "ObjectExpression"
  ) {
    return null;
  }

  // Filter and transform properties
  const properties = (styleAttr.value.expression.properties.filter(
    p =>
      p.type === "ObjectProperty" && supportedValueTypes.includes(p.value.type)
  ) as ObjectProperty[]).map(p => ({
    // @ts-expect-error
    key: p.key.name as string,
    value:
      p.value.type === "TemplateLiteral"
        ? p.value.quasis.map(el => el.value.raw).join("")
        : (p.value as StringLiteral).value,
  }));

  return {
    start: styleAttr.start!,
    end: styleAttr.end!,
    properties,
  };
};

const getOtherAttrs = (element: JSXElement): Attributes | undefined => {
  const openingEl = element.openingElement
  const attrs = openingEl.attributes.filter(
    a => a.type === 'JSXAttribute' && a.name.name !== 'style'
  ) as JSXAttribute[] | undefined

  const spreadAttrs = openingEl.attributes.filter(
    a => a.type === 'JSXSpreadAttribute'
  ) as JSXSpreadAttribute[] | undefined

  // if objects are undefined, or are both empty arrays, return undefined
  if ((!attrs && !spreadAttrs) || ((attrs && attrs.length === 0) && (spreadAttrs && spreadAttrs.length === 0))) {
    return undefined;
  }

  return {
    attrs,
    spreadAttrs
  }
}

export const parseDocument = (text: string, currentOffset: number) => {
  const file = parse(text, babelOptions);

  const {
    selectedElement,
    insertPosition,
    importStatementExisting,
    parentNode
  } = findTagAndInsertPosition(file, currentOffset);

  if (selectedElement === undefined) {
    throw new Error("Could not find element");
  }

  const elementName = (selectedElement.openingElement.name as JSXIdentifier).name;

  const styleAttr = getStyleAttribute(selectedElement);
  const otherAttrs = getOtherAttrs(selectedElement);

  return {
    selectedElement,
    elementName,
    insertPosition,
    importStatementExisting,
    styleAttr,
    otherAttrs,
    parentNode
  };
};
