/*eslint strict: [2, "function"] */
/*global define: false */

define(['jquery', 'underscore', 'unicode_utils'], function ($, _, unicode) {
	"use strict";

	// Return a slice of genesets over the current position.
	var genesetParse = function (text) {
			// Handle carriage return. Strip comment lines. Allow implicit comma at newline. Strip whitespace.
			var list = unicode.normalize(text).replace(/\r/g, '\n').replace(/#[^\n]*/g, "").replace(/^\s+/, '').replace(/\s+$/, '').split(/[\s,]+/);
			return _(list).without('');
		};

	return {
		genesetParse: genesetParse
	};

});
