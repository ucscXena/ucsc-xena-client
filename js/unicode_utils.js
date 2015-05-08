/*eslint strict: [2, "function"] */
/*global define: false */
define(['underscore'], function (_) {
	'use strict';

	function lookupWidechar(i) {
		if (i >= 0xFF01 && i <= 0xFF53) {
			return i - 0xFF00 + 32;
		}
		return i;
	}

	function stripUnicode(c) {
		return String.fromCharCode(lookupWidechar(c.charCodeAt(0)) & 0xFF);
	}

	function mapString(s, f) {
		return _.map(s.split(''), f).join('');
	}

	function normalize(s) {
		return mapString(s, stripUnicode);
	}

	return {
		normalize: normalize
	};
});
