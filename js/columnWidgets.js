/*eslint strict: [2, "function"] */
/*global define: false */
define(['multi'], function (multi) {
	'use strict';

	var widget = {
		cmp: multi(x => x.dataType),
		fetch: multi(x => x.dataType),
		column: multi(x => x.column.dataType)
	};

	return widget;
});
