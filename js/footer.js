/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena footer, writes itself into the element with ID "footer" in page.template.
 */


// Core dependencies, components
var React = require('react');
import {Box, ThemeProvider, Typography} from '@material-ui/core';
var ReactDOM = require('react-dom');
import {xenaTheme} from './xenaTheme';

// Styles
var compStyles = require('./footer.module.css');

class Footer extends React.Component {
	render() {
		return (
			<div className={compStyles.footer}>
				<Typography component='div' className={compStyles.footerLinks} variant='body1'>
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
				</Typography>
				<Typography component='div' className={compStyles.footerCR} variant='caption'>
					<Box component='span' fontWeight={300}>Copyright © 2016, The Regents of the University of California,
					Santa Cruz All. Rights Reserved. Apache-2.0 license.</Box>
				</Typography>
			</div>
		);
	}
}

var footer = document.getElementById('footer');

ReactDOM.render(<ThemeProvider theme={xenaTheme}><Footer /></ThemeProvider>, footer);
