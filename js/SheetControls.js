/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet control toolbar. Displays state of zoom and filter and,
 * additional actions to show/hide null data or show/hide gene zoom.
 *
 */

'use strict';

// Core dependencies, components
var React = require('react');

// App dependencies
var SheetStatus = require('./views/SheetStatus');

// Styles
var classNames = require('classnames');
var compStyles = require('./SheetControls.module.css');

// TODO this is for filters - remove
var FilterArray = ["None"];

// TODO create state for when sheetControls mode is active/inactive. Inactive when in edit/create mode.
// TODO inactive mode, sheetActions state disabled is true and SheetStatus state disabled is true

class SheetControls extends React.Component {

	render() {
		var {actionsDisabled, statusDisabled} = this.props;
		return (
			<div className={compStyles.sheetControls}>
				<div className={compStyles.sheetStatus}>
					<SheetStatus disabled={false} label="Zoom" sheetState="None"/>
					{FilterArray.map((filter, i) => <SheetStatus key={i} disabled={statusDisabled} label="Filter"
																 sheetState={filter}/>)}
				</div>
				<div className={compStyles.sheetActions}>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Show Gene Zoom</span>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Hide Null Data</span>
				</div>
			</div>
		);
	}
}

module.exports = SheetControls;
