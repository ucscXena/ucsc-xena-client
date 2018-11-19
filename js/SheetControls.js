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
var _ = require('./underscore_ext');

// App dependencies
var SheetStatus = require('./views/SheetStatus');

// Styles
// var classNames = require('classnames');
var compStyles = require('./SheetControls.module.css');

// TODO this is for filters - remove
// var FilterArray = ["None"];

// TODO create state for when sheetControls mode is active/inactive. Inactive when in edit/create mode.
// TODO inactive mode, sheetActions state disabled is true and SheetStatus state disabled is true

class SheetControls extends React.Component {

	render() {
		var {appState, clearZoom, statusDisabled} = this.props,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			/*filterLabel = 'Filter:',*/
			zoomLabel = count === appState.samples.length ? 'Zoom:' : 'Zoomed',
			zoomState = count === appState.samples.length ? 'None' :
				`to rows ${index + 1} - ${index + count}`;
		return (
			<div className={compStyles.sheetControls}>
				<div className={compStyles.sheetStatus}>
					<SheetStatus disabled={statusDisabled} label={zoomLabel} onClose={clearZoom} sheetState={zoomState}/>
					{/*{FilterArray.map((filter, i) => <SheetStatus key={i} disabled={statusDisabled} label={filterLabel}
																 sheetState={filter}/>)}*/}
				</div>
				{/*<div className={compStyles.sheetActions}>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Show Gene Zoom</span>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Hide Null Data</span>
				</div>*/}
			</div>
		);
	}
}

module.exports = SheetControls;
