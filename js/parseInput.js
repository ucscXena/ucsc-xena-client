'use strict';

function parse(str) {
	return str.trim().replace(/^,+|,+$/g, '').split(/[\s,]+/);
}

module.exports = parse;
