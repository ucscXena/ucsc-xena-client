'use strict';

import PureComponent from './PureComponent';
var _ = require('./underscore_ext');
var React = require('react');
require('react-resizable/css/styles.css');
var getColumns = require('./views/Columns');
import SampleZoomIndicator from './views/SampleZoomIndicator';
var classNames = require('classnames');
import {Button} from 'react-toolbox/lib/button';

// Styles
require('./Columns.css'); // XXX switch to js styles
var compStyles = require('./Spreadsheet.module.css');


function noZoom(samples, zoom) {
	return _.merge(zoom, {count: samples, index: 0});
}

function zoomPopover(props) {
	return (
		<div className={classNames(compStyles.zoomDialog, {[compStyles.active]: props.active})}>
			<div className={compStyles.content}>Shift-click on data to zoom out.<br/>Click to zoom in.</div>
			<div className={compStyles.actions}>
				<Button accent onClick={props.onDisableClick}>GOT IT</Button>
			</div>
		</div>
	);
}

var getSpreadsheet = columnsWrapper => {
	var Columns = getColumns(columnsWrapper);
	return class extends PureComponent {
	    static displayName = 'Spreadsheet';

	    zoomHelpDisable = () => {
			this.props.callback(['zoom-help-disable']);
		};

	    render() {
			var {appState: {data, columns, samples, zoom, zoomHelp}, children, ...otherProps} = this.props,
				zoomHelper = zoomHelp ?
					zoomPopover({
						active: true,
						onDisableClick: this.zoomHelpDisable
					}) : null;
			return (
				<div className={compStyles.Spreadsheet}>
					{zoom.count < samples.length ? <SampleZoomIndicator data={data.samples} column={columns.samples} zoom={noZoom(samples.length, zoom)}></SampleZoomIndicator> : null }
					<Columns appState={this.props.appState} {...otherProps}>
						{children}
					</Columns>
					{zoomHelper}
				</div>
			);
		}
	};
};

module.exports = getSpreadsheet;
