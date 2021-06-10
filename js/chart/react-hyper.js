var React = require('react');
var _ = require('../underscore_ext').default;

var isChild = x => x === null || typeof x === 'string' || React.isValidElement(x);
// Render tag with list of children, and optional props as first argument.
export var el = type => (...args) =>
	args.length === 0 ? React.createElement(type, {}) :
	isChild(args[0]) ? React.createElement(type, {}, ...args) :
	React.createElement(type, args[0], ...args.slice(1));

export var a = el('a');
export var b = el('b');
export var canvas = el('canvas');
export var div = el('div');
export var h1 = el('h1');
export var h2 = el('h2');
export var h3 = el('h3');
export var i = el('i');
export var img = el('img');
export var label = el('label');
export var option = el('option');
export var p = el('p');
export var select = el('select');
export var span = el('span');
export var table = el('table');
export var tbody = el('tbody');
export var td = el('td');
export var textNode = _.identity;
export var tr = el('tr');
