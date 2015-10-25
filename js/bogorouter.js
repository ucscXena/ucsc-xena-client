/*eslint no-unused-expressions: 0 */
/*global document: false, require: false, __webpack_public_path__: true, process: false */
'use strict';
var config = require('config');
__webpack_public_path__ = config.baseurl; //eslint-disable-line camelcase

// XXX There is an uglify2 bug which will drop the require() calls if we don't access a
// property on the return value.
// https://github.com/mishoo/UglifyJS2/commit/276b9a31cda2a2ef93e7af4e966baae91a434361

if (document.location.pathname.match(/datapages\/$/)) {
    /* jshint -W030 */ // XXX jshint doesn't like the workaround.
	require.ensure(['datapages'], function () {
		require(['datapages']).foo; // XXX see above
	});
} else if (document.location.pathname.match(/hub\/$/)) {
	require.ensure(['hub'], function () {
		require(['hub']).foo;       // XXX see above
	});
} else if (document.location.pathname.match(/heatmap\/$/)) {
	require.ensure(['main'], function () {
		require(['main']).foo;      // XXX see above
	});
} else if (process.env.NODE_ENV !== 'production' && document.location.pathname.match(/docs\/$/)) {
	require.ensure(['docs'], function () {
		require(['docs']).foo;      // XXX see above
	});
} else {
	// XXX should 404 here
	require.ensure(['main'], function () {
		require(['main']).foo;      // XXX see above
	});
}
