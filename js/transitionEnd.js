/*eslint-env browser */
/*global module: false */
// https://gist.github.com/O-Zone/7230245
'use strict';

var transitions = {
	'transition': 'transitionend',
	'WebkitTransition': 'webkitTransitionEnd',
	'MozTransition': 'transitionend',
	'OTransition': 'otransitionend'
},
	elem = document.createElement('div'),
	transitionEnd;

for (var t in transitions) {
	if (typeof elem.style[t] !== 'undefined') {
		transitionEnd = transitions[t];
		break;
	}
}

module.exports = transitionEnd;
