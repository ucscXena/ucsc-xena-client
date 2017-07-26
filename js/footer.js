/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena footer, writes itself into the element with ID "footer" in page.template.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var ReactDOM = require('react-dom');

// Styles
var compStyles = require('./footer.module.css');

var Footer = React.createClass({
	render() {
		return (
			<div className={compStyles.footer}>
				<div className={compStyles.footerLinks}>
					<ul>
						<li><a href=''>UCSC</a></li>
						<li><a href=''>UCSC Genomics Institute</a></li>
						<li><a href=''>UCSC Genomics Institute</a></li>
					</ul>
					<ul>
						<li><a href=''>email</a></li>
						<li><a href=''>twitter</a></li>
						<li><a href=''>github</a></li>
					</ul>
				</div>
				<div className={compStyles.footerCR}>Copyright © 2016, The Regents of the University of California,
					Santa Cruz All. Rights Reserved. Apache-2.0 license.
				</div>
			</div>
		);
	}
});

var footer = document.getElementById('footer');

ReactDOM.render(<Footer />, footer);
