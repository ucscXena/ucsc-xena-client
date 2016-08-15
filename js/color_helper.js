/*global require: false, module: false */
'use strict';

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

var colorStr = c => 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')';

module.exports = {
    hexToRGB,
    colorStr
};
