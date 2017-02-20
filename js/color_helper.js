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

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

var colorStr = c => 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')';

var greyHEX = "#808080";

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
    throw Error("Unknown color format " + color);
}

// http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
var luminance = ([R, G, B]) => 0.299 * R + 0.587 * G + 0.114 * B;
var contrastColor = color => {
    let lumi = luminance(rgb(color)),
        brighter = _.min([Math.round(lumi + 190), 221]);
    return lumi < 128 ? rgbToHex(brighter, brighter, brighter) : 'black';
};

module.exports = {
    hexToRGB,
    colorStr,
    greyHEX,
    contrastColor,
    rgb
};
