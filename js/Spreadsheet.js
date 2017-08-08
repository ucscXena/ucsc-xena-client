'use strict';

var React = require('react');
var Button = require('react-bootstrap/lib/Button');
var Popover = require('react-bootstrap/lib/Popover');
require('react-resizable/css/styles.css');
var {deepPureRenderMixin} = require('./react-utils');
require('./Columns.css'); // XXX switch to js styles
var getColumns = require('./views/Columns');

function zoomPopover(zoom, samples, props) {
	return (
		<Popover {...props} placement="right" positionLeft={-20} positionTop={40}>
			<p>Shift-click to zoom out.</p>
			<Button onClick={props.onDisableClick}>Ok</Button>
		</Popover>
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
			var {appState: {zoom, samples, zoomHelp}, children, ...otherProps} = this.props,
				zoomHelper = zoomHelp ?
					zoomPopover(zoom, samples, {
						onClick: this.zoomHelpClose,
						onDisableClick: this.zoomHelpDisable
					}) : null;
			return (
				<div>
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
