import * as assert from 'assert';

import { window } from 'vscode';
import { parseDocument } from '../../util/parseDocument';

suite('Extension Test Suite', () => {
	window.showInformationMessage('Start all tests.');

	test("Should transform style property", () => {
		const t = `
			  <div style={{
				  marginTop: '12px'
			  }}/>
		  `;
		const {
			selectedElement,
			elementName,
			insertPosition,
			styleAttr,
		} = parseDocument(t, 10);

		assert.notStrictEqual(selectedElement, undefined);
		assert.notStrictEqual(styleAttr, undefined);
		assert.strictEqual(styleAttr?.properties.length, 1);
		assert.strictEqual(styleAttr?.properties[0].key, 'marginTop');
		assert.strictEqual(styleAttr?.properties[0].value, '12px');

		assert.strictEqual(elementName, 'StyledDiv')
		assert.strictEqual(insertPosition, 0)
	});
});
