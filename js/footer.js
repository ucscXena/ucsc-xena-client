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

class Footer extends React.Component {
	render() {
		return (
			<div className={compStyles.footer}>
				<div className={compStyles.footerLinks}>
					<ul>
						<li><a href='https://www.ucsc.edu/' target='_blank'>UCSC</a></li>
						<li><a href='https://ucscgenomics.soe.ucsc.edu/' target='_blank'>UCSC Genomics Institute</a></li>
						<li><a href='https://cgl.genomics.ucsc.edu/' target='_blank'>UCSC Computational Genomics Laboratory</a></li>
						<li><a href='http://xena.ucsc.edu/' target='_blank'>UCSC Xena</a></li>
					</ul>
					<ul>
						<li><a href='mailto:genome-cancer@soe.ucsc.edu'>Email</a></li>
						<li><a href='https://twitter.com/ucscxena' target='_blank'>Twitter</a></li>
						<li><a href='https://github.com/ucscXena' target='_blank'>Github</a></li>
					</ul>
				</div>
				<div className={compStyles.footerCR}>Copyright © 2016, The Regents of the University of California,
					Santa Cruz All. Rights Reserved. Apache-2.0 license.
				</div>
			</div>
		);
	}
}

var footer = document.getElementById('footer');

ReactDOM.render(<Footer />, footer);
