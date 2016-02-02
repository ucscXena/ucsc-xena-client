/*global require: false, module: false */
'use strict';
var React = require('react');
var ReactDOM = require('react-dom');
var L = require('lenses/lens');

// Create a lens which updates a react component.
function reactState(App, el) {
	var state,
		lens;
	function setter(x, s) {
		state = s;
		ReactDOM.render(<App lens={lens} />, el);
	}
	lens = L.lens(() => state, setter);
	return lens;
}

module.exports = reactState;
