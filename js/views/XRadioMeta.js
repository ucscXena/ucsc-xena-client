/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Component for listing radio or checkbox meta data, when viewing advanced mode.
 */


// Core dependencies, components
import {Box, Divider, Typography} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;

// Styles
var compStyles = require('./XRadioMeta.module.css');

class XRadioMeta extends React.Component {
	render() {
		var {meta} = this.props;
		return (
			<Typography className={compStyles.XRadioMeta} component='ul' variant='caption'>
				{_.map(meta, (m, i) =>
					<React.Fragment key={`${m.label}${i}`}>
						<Divider light/>
						<li className={compStyles.meta} key={m.label}>
						<span className={compStyles.label}>{m.label}</span>
							<Box className={compStyles.value} color='text.hint'>{m.value}</Box>
							<Box className={compStyles.more} color='secondary.main'>+12 more</Box>
						</li>
					</React.Fragment>)}
				<Divider light/>
			</Typography>
		);
	}
}

module.exports = XRadioMeta;
