/*global document: false, require: false, __webpack_public_path__: true */
'use strict';
var config = require('config');
__webpack_public_path__ = config.baseurl;
if (document.location.pathname.match(/datapages\/$/)) {
	require.ensure(['datapages'], function () {
		require(['datapages']);
	});
} else if (document.location.pathname.match(/hub\/$/)) {
	require.ensure(['hub'], function () {
		require(['hub']);
	});
} else if (document.location.pathname.match(/heatmap\/$/)) {
	require.ensure(['main'], function () {
		require(['main']);
	});
} else {
	// XXX should 404 here
	require.ensure(['main'], function () {
		require(['main']);
	});
}
