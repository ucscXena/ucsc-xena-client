/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet control toolbar. Displays state of zoom and filter and,
 * additional actions to show/hide null data or show/hide gene zoom.
 *
 */


// Core dependencies, components
import {Box, ButtonBase, Paper, Tooltip} from '@material-ui/core';
var React = require('react');
var _ = require('./underscore_ext').default;

// App dependencies
var SheetStatus = require('./views/SheetStatus');
import {xenaColor} from './xenaColor';

// Styles
var compStyles = require('./SheetControls.module.css');
var classNames = require('classnames');
var sxActionButton = {
	color: xenaColor.ACCENT,
	fontSize: 12,
	letterSpacing: '0.75px',
	lineHeight: '24px',
	height: 24, /* Required to maintain centered buttons when status chips wrap to new line */
	'&:disabled': {
		color: xenaColor.BLACK_12,
	},
};
var sxSheetControls = {
	borderBottom: `1px solid ${xenaColor.BLACK_12}`,
};

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
			ZoomStatus = (<SheetStatus disabled={statusDisabled} label={zoomLabel} sheetState={zoomState}/>);
		return (
			<Box component={Paper} className={compStyles.sheetControls} elevation={0} square sx={sxSheetControls}>
				{mode === 'chart' ? null : <div className={compStyles.sheetStatus}>
					{zoomed ? ZoomStatus : <Tooltip title='Click and drag to zoom'>{ZoomStatus}</Tooltip>}
					{zoomed ? <div className={classNames(compStyles.zoomActions, compStyles.zoomAnimate)}>
						<Box component={ButtonBase} disableRipple onClick={zoomOut} sx={sxActionButton}>Zoom Out</Box>
						<Box component={ButtonBase} disableRipple onClick={clearZoom} sx={sxActionButton}>Clear Zoom</Box>
					</div> : null}
					{/*{FilterArray.map((filter, i) => <SheetStatus key={i} disabled={statusDisabled} label={filterLabel}
																 sheetState={filter}/>)}*/}
				</div> }
				{/*<div className={compStyles.sheetActions}>
					<Box component={ButtonBase} disabled={actionsDisabled} sx={sxActionButton}>Show Gene Zoom</Box>
					<Box component={ButtonBase} disabled={actionsDisabled} sx={sxActionButton}>Hide Null Data</Box>
				</div>*/}
			</Box>
		);
	}
}

export default SheetControls;
