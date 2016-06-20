/*globals require: false, module: false */
'use strict';

var React = require('react');
var Col = require('react-bootstrap/lib/Col');
var Row = require('react-bootstrap/lib/Row');
var Button = require('react-bootstrap/lib/Button');
var Popover = require('react-bootstrap/lib/Popover');
require('react-resizable/css/styles.css');
var {deepPureRenderMixin} = require('./react-utils');
require('./Columns.css'); // XXX switch to js styles
var addTooltip = require('./views/addTooltip');
var disableSelect = require('./views/disableSelect');
var addColumnAddButton = require('./views/addColumnAddButton');
var addVizEditor = require('./views/addVizEditor');
var makeSortable = require('./views/makeSortable');
var YAxisLabel = require('./views/YAxisLabel');

var getColumns = Wrapper => React.createClass({
	displayName: 'SpreadsheetColumns',
	mixins: [deepPureRenderMixin],
	render() {
		var {onClick, children, ...wrapperProps} = this.props;
		return (
			<Wrapper {...wrapperProps}>
				{children}
			</Wrapper>);
	}
});

var ColumnsWrapper = React.createClass({
	render() {
		var {children, widgetProps, ...optProps} = this.props;
		return (
			<div {...optProps} className="Columns">
				{children}
			</div>);
	}
});

var FullWrapper = addTooltip(makeSortable(disableSelect(addColumnAddButton(addVizEditor(ColumnsWrapper)))));
// XXX without tooltip, we have no mouse pointer. Should make the wrapper add the css
// that hides the mouse. Currently this is in Column.
//var FullWrapper = makeSortable(disableSelect(ColumnsWrapper));

var Columns = getColumns(FullWrapper);

function zoomPopover(zoom, samples, props) {
	return (
		<Popover {...props} placement="right" positionLeft={-20} positionTop={40} title="Zooming">
			<p>As shown at left, you are now viewing {zoom.count} of the {samples.length} samples.</p>
			<p>Zoom on samples (vertically) by clicking on the graph.</p>
			<p>Zoom out with shift-click.</p>
			<Button onClick={props.onDisableClick}>Don't show this again</Button>
		</Popover>
	);
}

var Spreadsheet = React.createClass({
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
			<Row>
				<Col md={1}>
					<YAxisLabel
						samples={samples}
						zoom={zoom}
					/>
				</Col>
				<Col md={11}>
					<Columns appState={this.props.appState} {...otherProps}>
						{children}
					</Columns>
					{zoomHelper}
				</Col>
			</Row>
		);
	}
});
module.exports = Spreadsheet;
