/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Component for listing radio or checkbox meta data, when viewing advanced mode.
 */


// Core dependencies, components
var React = require('react');
var _ = require('../underscore_ext');

// Styles
var compStyles = require('./XRadioMeta.module.css');

class XRadioMeta extends React.Component {
	render() {
		var {meta} = this.props;
		return (
			<ul className={compStyles.XRadioMeta}>
				{_.map(meta, m => <li className={compStyles.meta} key={m.label}>
					<span className={compStyles.label}>{m.label}</span><span className={compStyles.value}>{m.value}</span><span
					className={compStyles.more}>+12 more</span></li>)}
			</ul>
		);
	}
}

module.exports = XRadioMeta;
