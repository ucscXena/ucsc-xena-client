/*global document: false, require: false */
'use strict';
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
