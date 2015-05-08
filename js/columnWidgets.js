/*eslint strict: [2, "function"] */
/*global define: false */
define(['multi'], function (multi) {
	'use strict';

	var widget = {
		cmp: multi(x => x),
		fetch: multi(x => x),
		column: multi(x => x.column.dataType)
	};

	return widget;
});
