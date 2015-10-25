/*global require: false, module: false, document: false */
'use strict';

var demo = require('../docs/schema');
var {toHTML, css} = require('schema-shorthand').html;
var main = document.getElementById('main');
var _ = require('underscore');

var top = _.values(demo);

var docs = _.map(top, s => toHTML(s, top)).join('<br>');
var page =
`<html>
    <body>
    ${css}
	${docs}
    </body>
</html>`;

main.innerHTML = page;
