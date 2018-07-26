'use strict';

var _ = require('./underscore_ext');

//http://www.javascripter.net/faq/hextorgb.htm
var cutHex = function (h) {return (h.charAt(0) === "#") ? h.substring(1, 7) : h;};
var hexToR = function (h) {return parseInt((cutHex(h)).substring(0, 2), 16);};
var hexToG = function (h) {return parseInt((cutHex(h)).substring(2, 4), 16);};
var hexToB = function (h) {return parseInt((cutHex(h)).substring(4, 6), 16);};

var hexToRGB = function(hex, a = 1) {
    var c = {},
        r = hexToR(hex),
        g = hexToG(hex),
        b = hexToB(hex);

    c.r = r;
    c.g = g;
    c.b = b;
    c.a = a;
    return c;
};

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
};

function RGBToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

var colorStr = c => 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')';

var greyHEX = "#808080";
var lightgreyHEX = "#dcdcdc";

function standardizeColor(str) {
	var ctx = document.createElement('canvas').getContext('2d');
	ctx.fillStyle = str;
	var c = hexToRGB(ctx.fillStyle);
	return [c.r, c.g, c.b];
}

function rgb(color) {
    if (_.isArray(color)) {
        return color;
    }
    if (!color) {
        return color;
    }
    if (color.indexOf('rgb') === 0) {      // rgb[a]
        return _.map(color.replace(/^rgba?\(([^)]*)\)/, "$1").split(/ *, */).slice(0, 3),
                     n => parseInt(n, 10));
    } else if (color.indexOf('#') === 0) { // hex
        return [
            parseInt(color.substring(1, 3), 16),
            parseInt(color.substring(3, 5), 16),
            parseInt(color.substring(5, 7), 16)
        ];
    }
    return standardizeColor(color);
}

// http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
var luminance = ([R, G, B]) => 0.299 * R + 0.587 * G + 0.114 * B;
var contrastColor = color => {
    let lumi = luminance(rgb(color)),
        brighter = _.min([Math.round(lumi + 190), 221]);
    return lumi < 128 ? RGBToHex(brighter, brighter, brighter) : 'black';
};

function HSVtoRGB(h, s, v) {
	var r, g, b, i, f, p, q, t;
	if (arguments.length === 1) {
		s = h.s, v = h.v, h = h.h;
	}
	i = Math.floor(h * 6);
	f = h * 6 - i;
	p = v * (1 - s);
	q = v * (1 - f * s);
	t = v * (1 - (1 - f) * s);
	switch (i % 6) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};
}

function RGBtoHSV(r, g, b) {
	if (arguments.length === 1) {
		g = r.g, b = r.b, r = r.r;
	}
	var max = Math.max(r, g, b), min = Math.min(r, g, b),
		d = max - min,
		h,
		s = (max === 0 ? 0 : d / max),
		v = max / 255;

	switch (max) {
		case min: h = 0; break;
		case r: h = (g - b) + d * (g < b ? 6 : 0); h /= 6 * d; break;
		case g: h = (b - r) + d * 2; h /= 6 * d; break;
		case b: h = (r - g) + d * 4; h /= 6 * d; break;
	}

	return {
		h: h,
		s: s,
		v: v
	};
}

module.exports = {
    hexToRGB,
    RGBToHex,
    colorStr,
    greyHEX,
    lightgreyHEX,
    contrastColor,
    rgb,
    HSVtoRGB,
    RGBtoHSV
};
