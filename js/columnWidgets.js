/*global define: false */
define(['multi'], function (multi) {
	'use strict';

	function columnDataType(s) {
		return s;
	}

	var widget = {
		cmp: multi(columnDataType),
		fetch: multi(columnDataType),
		plot: multi(columnDataType),
		legend: multi(columnDataType)
	};

	return widget;
});
