/*global require: false, module: false, navigator: false */
'use strict';

var _ = require('underscore');

// Using a modifier works differently on different os.
// On OSX, ctrl-click will do browser context menu, so
// only alt-click is usable by the app.
// On linux, alt-click will do window operations, so
// only ctrl-click is usable by the app.
// Need to test Windows.
var keys = {
	alt: {
		key: 'altKey',
		name: 'alt'
	},
	ctrl: {
		key: 'ctrlKey',
		name: 'control'
	}
};

var patterns = [
	[/^Linux/, keys.ctrl],
	[/^.*/, keys.alt]
];


module.exports = _.find(patterns, ([p]) => navigator.platform.match(p))[1];
