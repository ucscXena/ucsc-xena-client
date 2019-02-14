'use strict';

import PureComponent from './PureComponent';
var React = require('react');
require('react-resizable/css/styles.css');
var getColumns = require('./views/Columns');
import SampleZoomIndicator from './views/SampleZoomIndicator';
import {Button} from 'react-toolbox/lib/button';

// Styles
require('./Columns.css'); // XXX switch to js styles
var compStyles = require('./Spreadsheet.module.css');
var classNames = require('classnames');

function zoomPopover(props) {
	return (
		<div className={classNames(compStyles.zoomDialog, {[compStyles.active]: props.active})}>
			<div className={compStyles.content}>Click and drag to zoom in.</div>
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
			var {appState: {data, addColumnAddHover, columns, enableTransition, samples, zoom, zoomHelp}, children, ...otherProps} = this.props,
				zoomHelper = zoomHelp ?
					zoomPopover({
						active: true,
						onDisableClick: this.zoomHelpDisable
					}) : null;
			return (
				<div className={compStyles.Spreadsheet}>
					{zoom.count < samples.length ? <SampleZoomIndicator column={columns.samples} addColumnAddHover={addColumnAddHover} enableTransition={enableTransition} data={data.samples} samples={samples} zoom={zoom}/> : null }
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
