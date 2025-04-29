
function parse(str) {
	return str.trim().replace(/^,+|,+$/g, '').split(/[\s,]+/);
}

export default parse;
