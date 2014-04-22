define(['multi'], function (multi) {
	'use strict';

	function columnDataType(s) {
		return s.column.dataType;
	}

	function columnDataTypeExt(s) {
		return s.ws.column.dataType;
	}

	var widget = {
		cmp: multi(columnDataType),
		fetch: multi(columnDataType),
		render: multi(columnDataType)
//		render: multi(columnDataTypeExt)
	};

	return widget;
});
