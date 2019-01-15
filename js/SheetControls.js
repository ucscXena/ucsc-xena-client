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
import Tooltip from 'react-toolbox/lib/tooltip';

// Styles
var compStyles = require('./SheetControls.module.css');

class SheetControls extends React.Component {

	render() {
		var {appState, clearZoom, statusDisabled} = this.props,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			/*filterLabel = 'Filter:',*/
			zoomed = count !== appState.samples.length,
			zoomLabel = zoomed ? 'Zoomed' : 'Zoom:',
			zoomState = zoomed ? `to rows ${index + 1} - ${index + count}` : 'None',
			zoomStatus = (<SheetStatus disabled={statusDisabled} label={zoomLabel} onClose={clearZoom} sheetState={zoomState}/>),
			ZoomTooltip = Tooltip('zoomStatus');
		return (
			<div className={compStyles.sheetControls}>
				<div className={compStyles.sheetStatus}>
					{zoomed ? zoomStatus : <ZoomTooltip tooltip='Click and drag to zoom'>{zoomStatus}</ZoomTooltip>}
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
