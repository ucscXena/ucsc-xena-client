'use strict';

var React = require('react');
require('react-resizable/css/styles.css');
var {deepPureRenderMixin} = require('./react-utils');
var getColumns = require('./views/Columns');
var classNames = require('classnames');
import {Button} from 'react-toolbox/lib/button';

// Styles
require('./Columns.css'); // XXX switch to js styles
var compStyles = require('./Spreadsheet.module.css');

function zoomPopover(props) {
	return (
		<div className={classNames(compStyles.zoomDialog, {[compStyles.active]: props.active})} {...props}>
			<div className={compStyles.content}>Shift-click to zoom out.</div>
			<div className={compStyles.actions}>
				<Button accent onClick={props.onDisableClick}>GOT IT</Button>
			</div>
		</div>
	);
}

var getSpreadsheet = columnsWrapper => {
	var Columns = getColumns(columnsWrapper);
	return React.createClass({
		displayName: 'Spreadsheet',
		mixins: [deepPureRenderMixin],
		zoomHelpClose: function () {
			this.props.callback(['zoom-help-close']);
		},
		zoomHelpDisable: function () {
			this.props.callback(['zoom-help-disable']);
		},
		render: function () {
			var {appState: {zoomHelp}, children, ...otherProps} = this.props,
				zoomHelper = zoomHelp ?
					zoomPopover({
						active: true,
						onClick: this.zoomHelpClose,
						onDisableClick: this.zoomHelpDisable
					}) : null;
			return (
				<div className={compStyles.Spreadsheet}>
					<Columns appState={this.props.appState} {...otherProps}>
						{children}
					</Columns>
					{zoomHelper}
				</div>
			);
		}
	});
};

module.exports = getSpreadsheet;
