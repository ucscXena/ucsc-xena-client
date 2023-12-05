import GL from '@luma.gl/constants';

export var scales = {
	name: 'xena_scales',
	dependencies: [],
	vs: `
		float linear_scale(float upper, float lower, float value) {
			if (value < lower) {return 0.;} else
			if (value > upper) {return 1.;}
			else {return (value - lower) / (upper - lower);}
		}
		float log_scale(float upper, float lower, float value) {
			float m = 1. / (log2(upper + 1.) - log2(lower + 1.));
			float b = 1. - m * log2(upper + 1.);
			if (value < lower) {
				return 0.;
			} else if (value > upper) {
				return 1.;
			} else {
				return m * log2(value + 1.) + b;
			}
		}
		float color_scale(bool log, float upper, float lower, float value) {
			if (log) {
				return log_scale(upper, lower, value);
			} else {
				return linear_scale(upper, lower, value);
			}
		}`
};

var value0Attr =
	{values0: { size: 1, type: GL.FLOAT, accessor: 'getValues0' }};

var value0Decl = `
	attribute float values0;
	uniform bool log0;
	uniform float lower0;
	uniform float upper0;`;

var value1Attr =
	{values1: { size: 1, type: GL.FLOAT, accessor: 'getValues1' }};

var value1Decl = `
	attribute float values1;
	uniform bool log1;
	uniform float lower1;
	uniform float upper1;`;

var ordinalDecl = `
	attribute vec4 instanceColors;`;

var ordinalAttr =
	{instanceColors: {
		size: 4,
		type: GL.UNSIGNED_BYTE,
		normalized: true,
		transition: true,
		accessor: 'getColor'}};

export var floatProps = {
	key: 'float',
	decl: value0Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		color.a = color_scale(log0, upper0, lower0, values0);
		color.rgb = vec3(1., 0., 0.);`,
	attributes: value0Attr,
	uniforms: ['lower0', 'upper0', 'log0'],
};

export var ordinalProps = {
	key: 'ordinal',
	decl: ordinalDecl,
	// XXX add opacity, from deckgl shader standards?
	color: `color = vec4(instanceColors.rgb, 1.);`,
	attributes: ordinalAttr
};

export var floatFloatProps = {
	key: 'floatfloat',
	decl: value0Decl + value1Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		float r;
		r = color_scale(log0, upper0, lower0, values0);
		float b;
		b = color_scale(log1, upper1, lower1, values1);
		color.r = r;
		color.g = 0.;
		color.b = b;
		color.a = max(r, b);`,
	attributes: {...value0Attr, ...value1Attr},
	uniforms: ['lower0', 'upper0', 'log0', 'lower1', 'upper1', 'log1'],
};

export var floatOrdinalProps = {
	key: 'floatordinal',
	decl: ordinalDecl + value1Decl,
	// XXX add opacity, from deckgl shader standards?
	color: `
		color = instanceColors;
		color.a = color_scale(log1, upper1, lower1, values1);`,
	attributes: {...value1Attr, ...ordinalAttr},
	uniforms: ['lower1', 'upper1', 'log1'],
};


