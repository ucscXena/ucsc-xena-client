var React = require('react');
var _ = require('../underscore_ext');

var isChild = x => x === null || typeof x === 'string' || React.isValidElement(x);
// Render tag with list of children, and optional props as first argument.
export var el = type => (...args) =>
	args.length === 0 ? React.createElement(type, {}) :
	isChild(args[0]) ? React.createElement(type, {}, ...args) :
	React.createElement(type, args[0], ...args.slice(1));

export var div = el('div');
export var label = el('label');
export var select = el('select');
export var option = el('option');
export var h2 = el('h2');
export var i = el('i');
export var a = el('a');
export var b = el('b');
export var img = el('img');
export var td = el('td');
export var tr = el('tr');
export var tbody = el('tbody');
export var table = el('table');
export var textNode = _.identity;
