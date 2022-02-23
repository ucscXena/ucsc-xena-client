/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet status indicator. Displays label with state and,
 * additional actions to delete state.
 *
 */


// Core dependencies, components
var React = require('react');

// Styles
var classNames = require('classnames');
var compStyles = require('./SheetStatus.module.css');

class SheetStatus extends React.Component {

	render() {
		var {className, disabled, label, sheetState, ...statusProps} = this.props;
		return (
			<div className={classNames(className, compStyles.status, {[compStyles.disabled]: disabled}, {[compStyles.zoomAnimation]: sheetState !== 'None'})} {...statusProps}>
				{label ? <div className={compStyles.label}>{label}</div> : null}
				<div className={compStyles.state}>{sheetState}</div>
			</div>
		);
	}
}

module.exports = SheetStatus;
