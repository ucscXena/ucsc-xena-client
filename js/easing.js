/*global module: false */
'use strict';

// http://www.gizma.com/easing/

// t: current time (frame)
// b: start value
// c: end value
// d: duration (frames)
module.exports = {
	linearTween: (t, b, c, d) =>  c * t / d + b,
	easeInOutQuad: (t, b, c, d) => {
		t  /= d / 2;
		if (t < 1) {
			return c / 2 * t * t + b;
		}
		t--;
		return -c / 2 * (t * (t - 2) - 1) + b;
	}
};
