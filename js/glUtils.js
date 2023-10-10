var {Let} = require('./underscore_ext').default;

export var eqToString =
	Let((eqs = ['FUNC_ADD', 'FUNC_SUBTRACT', 'FUNC_REVERSE_SUBTRACT']) =>
		gl => Let((eq = gl.getParameter(gl.BLEND_EQUATION)) =>
			eqs.find(x => gl[x] === eq)));

export var funcToString =
	Let((funcs = ['ZERO', 'ONE', 'SRC_COLOR', 'ONE_MINUS_SRC_COLOR',
		'DST_COLOR', 'ONE_MINUS_DST_COLOR', 'SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA',
		'DST_ALPHA', 'ONE_MINUS_DST_ALPHA', 'CONSTANT_COLOR',
		'ONE_MINUS_CONSTANT_COLOR', 'CONSTANT_ALPHA',
		'ONE_MINUS_CONSTANT_ALPHA', 'SRC_ALPHA_SATURATE']) =>
			(gl, param) => Let((p = gl.getParameter(param)) =>
				funcs.find(x => gl[x] === p)));

// Put in deckGL
//					onWebGLInitialized: gl => {
// console.log('attr', gl.getContextAttributes());
// console.log('eq', eqToString(gl));
// console.log('src', funcToString(gl, gl.BLEND_SRC_RGB));
// console.log('dst', funcToString(gl, gl.BLEND_DST_RGB));
// console.log('src alpha', funcToString(gl, gl.BLEND_SRC_ALPHA));
// console.log('dst alpha', funcToString(gl, gl.BLEND_DST_ALPHA));
// }
