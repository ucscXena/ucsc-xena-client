
import demo from '../docs/schema';
import {html} from 'schema-shorthand';
var {toHTML, css} = html;
var main = document.getElementById('main');
import * as _ from './underscore_ext.js';

var docs = _.map(demo, s => toHTML(s, demo)).join('<br>');
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

main.innerHTML = page;
