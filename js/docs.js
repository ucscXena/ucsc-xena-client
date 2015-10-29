/*global require: false, module: false, document: false */
'use strict';

var demo = require('../docs/schema');
var {toHTML, css} = require('schema-shorthand').html;
var main = document.getElementById('main');
var _ = require('underscore');

var docs = _.map(demo, s => toHTML(s, demo)).join('<br>');
var page =
`<html>
    <body>
    ${css}
	${docs}
    </body>
</html>`;

main.innerHTML = page;
