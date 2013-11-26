/*jslint nomen: true */
/*global define: false */
define(['lib/underscore'], function (_) {
	'use strict';

	function lookup_widechar(i) {
		if (i >= 0xFF01 && i <= 0xFF53) {
			return i - 0xFF00 + 32;
		}
		return i;
	}

	function strip_unicode(c) {
		/*jslint bitwise: true */
		return String.fromCharCode(lookup_widechar(c.charCodeAt(0)) & 0xFF);
	}

	function map_string(s, f) {
		return _.map(s.split(''), f).join('');
	}

	function normalize(s) {
		return map_string(s, strip_unicode);
	}

	return {
		normalize: normalize
	};
});
