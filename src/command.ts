import { window, TextEditor, Range } from "vscode";
import { JSXElement, Node } from "@babel/types";
import { parseDocument, StyleAttribute } from "./util/parseDocument";
import { generateStyledComponent } from "./util/generateStyledComponent";
import { generateImportStatement } from "./util/generateImportStatement";
import { generateTypedef } from "./util/generateTypedefs";

export const COMMAND_NAME = "extension.exstyled";
export const EXTENSION_NAME = 'ExStyled';

export const capitaliseFirstLetter = (input: string) => `${input.substr(0, 1).toUpperCase()}${input.substr(1)}`;

export const exstyledCommand = async () => {
    const editor = window.activeTextEditor;

    if (!editor) {
        window.showInformationMessage(
            "Please only execute the command with an active file"
        );
        return;
    }

    const documentInformation = parseDocument(
        editor.document.getText(),
        editor.document.offsetAt(editor.selection.active)
    );

    const {
        selectedElement,
        elementName,
        insertPosition,
        styleAttr,
        otherAttrs,
        importStatementExisting,
        parentNode
    } = documentInformation;

    let componentName = await window.showInputBox({
        prompt: "Name: ",
        placeHolder: "Name of the component",
        value: `Styled${capitaliseFirstLetter(elementName)}`,
    });

    if (!componentName) {
        window.showInformationMessage("Please enter a name");
        return;
    }

    componentName = capitaliseFirstLetter(componentName);

    const typedef = await generateTypedef(editor.document, componentName, otherAttrs);
    const component = generateStyledComponent(elementName, componentName, styleAttr, typedef.length > 0);

    const importStatement =
        importStatementExisting
            ? null
            : await generateImportStatement(editor.document.uri);

    try {
        await modifyDocument({
            editor,
            styledComponent: component,
            importStatement,
            insertPosition,
            parentNode,
            oldElement: selectedElement,
            styleAttr,
            componentName,
            typedef
        });
    } catch (e) {
        window.showErrorMessage(`Could not update document: ${e}`);
        return;
    }
};

type ModifyDoc = {
    editor: TextEditor,
    styledComponent: string,
    importStatement: string | null,
    insertPosition: number,
    parentNode: Node | undefined
    oldElement: JSXElement,
    styleAttr: StyleAttribute | null,
    componentName: string,
    typedef: string | null
};
const modifyDocument = async ({
    editor,
    styledComponent,
    importStatement,
    insertPosition,
    parentNode,
    oldElement,
    styleAttr,
    componentName,
    typedef
}: ModifyDoc) => {
    const { document } = editor;
    const openName = oldElement.openingElement.name;
    const closeName = oldElement.closingElement?.name;

    const location = document.positionAt(insertPosition);


    await editor.edit(
        editBuilder => {
            // Insert import statement
            if (importStatement !== null) {
                editBuilder.insert(
                    location,
                    `${insertPosition > 0 ? '\n' : ''}${importStatement}\n`
                );
            }

            // Insert type
            if (typedef) {
                editBuilder.insert(
                    location,
                    `\n${importStatement ? '' : '\n'}${typedef}${importStatement ? '\n' : ''}`
                );
            }

            // Insert component
            editBuilder.insert(
                parentNode?.start ? document.positionAt(parentNode?.start) : location,
                `${importStatement ? '\n' : ''}${styledComponent}\n\n`
            );

            // Remove style-attribute
            if (styleAttr) {
                editBuilder.delete(
                    new Range(
                        document.positionAt(styleAttr.start!),
                        document.positionAt(styleAttr.end!)
                    )
                );
            }

            // Rename Opening Tag
            editBuilder.replace(
                new Range(
                    document.positionAt(openName.start!),
                    document.positionAt(openName.end!)
                ),
                componentName
            );

            // Rename Closing Tag
            if (closeName !== undefined) {
                editBuilder.replace(
                    new Range(
                        document.positionAt(closeName.start!),
                        document.positionAt(closeName.end!)
                    ),
                    componentName
                );
            }
        },
        // { undoStopBefore: false, undoStopAfter: false }
    );
};
