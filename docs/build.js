'use strict';

var schema = require('./schema');
var {toHTML, css} = require('schema-shorthand').html;
var _ = require('underscore');

var docs = _.map(schema, s => toHTML(s, schema)).join('<br>');
var page =
`<html>
	<style>
		.docs {
			margin: 20px;
		}
	</style>
    <body>
    ${css}
		<div class='docs'>
			${docs}
		</div>
    </body>
</html>`;

var fs = require('fs');
fs.writeFileSync('docs/schema.html', page);
0;
