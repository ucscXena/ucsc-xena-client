/*globals require: false, module: false */
'use strict';

var React = require('react');
var Col = require('react-bootstrap/lib/Col');
var Row = require('react-bootstrap/lib/Row');
var Button = require('react-bootstrap/lib/Button');
var Popover = require('react-bootstrap/lib/Popover');
var Sortable = require('./views/Sortable');
require('react-resizable/css/styles.css');
var _ = require('./underscore_ext');
var Column = require('./Column');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var getLabel = require('./getLabel');
require('./Columns.css'); // XXX switch to js styles
var addTooltip = require('./views/addTooltip');
var disableSelect = require('./views/disableSelect');
var addColumnAddButton = require('./views/addColumnAddButton');
var addVizEditor = require('./views/addVizEditor');

var YAxisLabel = require('./views/YAxisLabel');

function zoomIn(pos, samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.max(1, Math.round(count / 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + pos * count - nCount / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function zoomOut(samples, zoom) {
	var {count, index} = zoom;
	var nCount = Math.min(samples, Math.round(count * 3)),
		maxIndex = samples - nCount,
		nIndex = Math.max(0, Math.min(Math.round(index + (count - nCount) / 2), maxIndex));

	return _.merge(zoom, {count: nCount, index: nIndex});
}

function targetPos(ev) {
	var bb = ev.currentTarget.getBoundingClientRect();
	return (ev.clientY - bb.top) / ev.currentTarget.clientHeight;
}

var zoomInClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;
var zoomOutClick = ev => !ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.shiftKey;

var Columns = React.createClass({
	// XXX pure render mixin? Check other widgets, too, esp. columns.
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		this.events('plotClick');

		this.plotClick = this.ev.plotClick.subscribe(ev => {
			let {callback, appState: {zoom, samples}} = this.props;
			if (zoomOutClick(ev)) {
				callback(['zoom', zoomOut(samples.length, zoom)]);
			} else if (zoomInClick(ev)) {
				callback(['zoom', zoomIn(targetPos(ev), samples.length, zoom)]);
			}
		});
	},
	componentWillUnmount: function () { // XXX refactor into a takeUntil mixin?
		this.plotClick.dispose();
	},
	onReorder: function (order) {
		this.props.callback(['order', order]);
	},
	render: function () {
		var {callback, appState, widgetProps, Column, columnProps, ...optProps} = this.props;
		// XXX maybe rename index -> indexes?
		var {data, index, zoom, columns, columnOrder, samples, samplesMatched} = appState;
		var columnViews = _.map(columnOrder, (id, i) => (
			<Column
				{...columnProps}
				id={id}
				key={id}
				callback={callback}
				samples={samples}
				samplesMatched={samplesMatched}
				zoom={zoom}
				data={_.getIn(data, [id]) /* refGene */}
				column={_.getIn(columns, [id])}
				label={getLabel(i)}
				widgetProps={{
					...widgetProps,
					key: id,
					id: id,
					index: _.getIn(index, [id]),
					vizSettings: _.getIn(appState, [columns, id, 'vizSettings']),
					tooltip: this.props.tooltip, // XXX instead use map children?
					onClick: this.ev.plotClick,
					column: _.getIn(columns, [id])
				}}/>));

		return (
				<div {...optProps} className="Columns">
					<Sortable onClick={this.props.onClick} onReorder={this.onReorder}>
						{columnViews}
					</Sortable>
					{this.props.children}
				</div>
		);
	}
});

var TooltipColumns = addTooltip(disableSelect(addColumnAddButton(addVizEditor(Columns))));

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
		var {appState: {zoom, samples, zoomHelp}} = this.props,
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
					<TooltipColumns {...this.props}/>
					{zoomHelper}
				</Col>
			</Row>
		);
	}
});
module.exports = Spreadsheet;
