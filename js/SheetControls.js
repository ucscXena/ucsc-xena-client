/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet control toolbar. Displays state of zoom and filter and,
 * additional actions to show/hide null data or show/hide gene zoom.
 *
 */


// Core dependencies, components
import {Tooltip} from '@material-ui/core';
var React = require('react');
var _ = require('./underscore_ext').default;

// App dependencies
var SheetStatus = require('./views/SheetStatus');

// Styles
var compStyles = require('./SheetControls.module.css');
var classNames = require('classnames');

class SheetControls extends React.Component {

	render() {
		var {appState, clearZoom, statusDisabled, zoomOut} = this.props,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			/*filterLabel = 'Filter:',*/
			mode = appState.mode,
			zoomed = count !== appState.samples.length,
			zoomLabel = zoomed ? 'Zoomed' : 'Zoom:',
			zoomState = zoomed ? (index === index + count - 1) ? `to row ${index + 1}` : `to rows ${index + 1} - ${index + count}` : 'None',
			ZoomStatus = <SheetStatus disabled={statusDisabled} label={zoomLabel} sheetState={zoomState}/>;
		return (
			<div className={compStyles.sheetControls}>
				{mode === 'chart' ? null : <div className={compStyles.sheetStatus}>
					{zoomed ? ZoomStatus : <Tooltip title='Click and drag to zoom'>{ZoomStatus}</Tooltip>}
					{zoomed ? <div className={classNames(compStyles.zoomActions, compStyles.zoomAnimate)}>
						<span className={compStyles.action} onClick={zoomOut}>Zoom Out</span>
						<span className={compStyles.action} onClick={clearZoom}>Clear Zoom</span>
					</div> : null}
					{/*{FilterArray.map((filter, i) => <SheetStatus key={i} disabled={statusDisabled} label={filterLabel}
																 sheetState={filter}/>)}*/}
				</div> }
				{/*<div className={compStyles.sheetActions}>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Show Gene Zoom</span>
					<span className={classNames(compStyles.action, {[compStyles.disabled]: actionsDisabled})}>Hide Null Data</span>
				</div>*/}
			</div>
		);
	}
}

export default SheetControls;
