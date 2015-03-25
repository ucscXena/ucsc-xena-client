/*global define: false */
define(['multi'], function (multi) {
	'use strict';

	function columnDataType(s) {
		return s.column.dataType;
	}

	var widget = {
		cmp: multi(columnDataType),
		fetch: multi(columnDataType),
		render: multi(columnDataType)
	};

	return widget;
});
