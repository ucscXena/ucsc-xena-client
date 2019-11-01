
// ArrayBuffer to string.
//
// This is a hot method.
//
// Using fromCharCode.apply on the whole buffer, as recommended on various
// sites, will blow the stack.
//
// Tried chunking this to reduce calls to fromCharCode, e.g. call
// fromCharCode.apply(null, arr.slice..), but it has no measurable effect on
// performance.
function ab2str(buf) {
	var str = "",
		arr = new Uint16Array(buf),
		len = arr.length;
	for (var i = 0; i < len; ++i) {
		str += String.fromCharCode(arr[i]);
	}
	return str;
}

function str2ab(str) {
	var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
	var bufView = new Uint16Array(buf);
	for (var i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

module.exports = {
	ab2str,
	str2ab
};
