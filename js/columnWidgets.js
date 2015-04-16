/*global define: false */
define(['multi'], function (multi) {
	'use strict';

	var widget = {
		cmp: multi(x => x),
		fetch: multi(x => x),
		column: multi(x => x.rendering.dataType)
	};

	return widget;
});
