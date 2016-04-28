/*globals require: false, module: false */

'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var Col = require('react-bootstrap/lib/Col');
var Row = require('react-bootstrap/lib/Row');
var Button = require('react-bootstrap/lib/Button');
var Popover = require('react-bootstrap/lib/Popover');
var ColumnEdit = require('./ColumnEdit2');
var Sortable = require('./Sortable');
require('react-resizable/css/styles.css');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');
var Crosshair = require('./Crosshair');
var Tooltip = require('./Tooltip');
var rxEventsMixin = require('./react-utils').rxEventsMixin;
var meta = require('./meta');
var VizSettings = require('./VizSettings');
require('./Columns.css'); // XXX switch to js styles
require('./YAxisLabel.css'); // XXX switch to js styles

var YAxisLabel = React.createClass({
	render: function () {
		// XXX would prefer to enforce that these keys are present & destructure
		var height = _.getIn(this.props, ['zoom', 'height']),
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			length = _.getIn(this.props, ['samples', 'length']) || 0,
			fraction = count === length ? '' :
				// babel-eslint/issues/31
				`, showing ${ index } - ${ index + count - 1 }`, // eslint-disable-line comma-spacing
			text = `Samples (N=${ length }) ${ fraction }`;
		return (
			<div style={{height: height}} className="YAxisWrapper">
				<p style={{width: height}} className="YAxisLabel">{text}</p>
			</div>
		);
	}
});

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

var zoomInClick = ev =>
!ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey;

var zoomOutClick = ev =>
!ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.shiftKey;

var Columns = React.createClass({
	// XXX pure render mixin? Check other widgets, too, esp. columns.
	mixins: [rxEventsMixin],
	componentWillMount: function () {
		this.events('tooltip', 'click', 'plotClick');

		this.ev.plotClick.subscribe(ev => {
			let {callback, appState: {zoom, samples}} = this.props;
			if (zoomOutClick(ev)) {
				callback(['zoom', zoomOut(samples.length, zoom)]);
			} else if (zoomInClick(ev)) {
				callback(['zoom', zoomIn(targetPos(ev), samples.length, zoom)]);
			}
		});

		var toggle = this.ev.click.filter(ev => ev[meta.key])
			.map(() => 'toggle');

		this.tooltip = this.ev.tooltip.merge(toggle)
			// If open + user clicks, toggle freeze of display.
			.scan([null, false],
				([tt, frozen], ev) =>
					ev === 'toggle' ? [tt, tt.open && !frozen] : [ev, frozen])
			// Filter frozen events until frozen state changes.
			.distinctUntilChanged(([ev, frozen]) => frozen ? frozen : [ev, frozen])
			.map(([ev, frozen]) => _.assoc(ev, 'frozen', frozen))
			.subscribe(ev => {
				// Keep 'frozen' and 'open' params for both crosshair && tooltip
				let plotVisuals = {
					crosshair: _.omit(ev, 'data'), // remove tooltip-related param
					tooltip: _.omit(ev, 'point' ) // remove crosshair-related param
				};

				return this.setState(plotVisuals);
			});
	},
	componentDidMount: function() {
		this.setDOMDims(ReactDOM.findDOMNode(this));
	},
	componentWillUnmount: function () { // XXX refactor into a takeUntil mixin?
		// XXX are there other streams we're leaking? What listens on this.ev.click, etc?
		this.tooltip.dispose();
	},
	getInitialState: function () {
		return {
			dims: {
				clientHeight: 0,
				clientWidth: 0
			},
			crosshair: {open: false},
			openColumnEdit: this.props.appState.cohort ? false : true,
			tooltip: {open: false},
			openVizSettings: null
		};
	},
	componentWillReceiveProps: function(newProps) {
		if (!this.state.openColumnEdit && !newProps.appState.cohort) {
			this.setState({openColumnEdit: true});
		}
	},
	setDOMDims: function(domNode) {
		var nodeKeys = _.keys(this.state.dims);
		this.setState({ dims: _.pick(domNode, nodeKeys) });
	},
	setOrder: function (order) {
		this.props.callback(['order', order]);
	},
	onViz: function (id) {
		this.setState({openVizSettings: id});
	},
	render: function () {
		var {callback, fieldFormat, sampleFormat, disableKM, supportsGeneAverage, aboutDataset, appState} = this.props;
		// XXX maybe rename index -> indexes?
		var {data, index, zoom, columns, columnOrder, cohort, samples} = appState;
		var {openColumnEdit, openVizSettings} = this.state;
		var height = zoom.height;
		var editor = openColumnEdit ?
			<ColumnEdit
				{...this.props}
				onHide={() => this.setState({openColumnEdit: false})}
			/> : null;
		// XXX parameterize settings on column type
		var settings = openVizSettings ?
			<VizSettings
				id={openVizSettings}
				defaultNormalization={_.getIn(appState, ['columns', openVizSettings, 'defaultNormalization'])}
				fieldType={_.getIn(appState, ['columns', openVizSettings, 'fieldType'])}
				onRequestHide={() => this.setState({openVizSettings: null})}
				callback={callback}
				state={_.getIn(appState, ['columns', openVizSettings, 'vizSettings'])} /> : null;

		var columnViews = _.map(columnOrder, id => widgets.column({
			ref: id,
			key: id,
			id: id,
			data: _.getIn(data, [id]),
			index: _.getIn(index, [id]),
			vizSettings: _.getIn(appState, [columns, id, 'vizSettings']),
			samples,
			zoom,
			callback,
			fieldFormat,
			sampleFormat,
			disableKM,
			aboutDataset,
			supportsGeneAverage,
			tooltip: this.ev.tooltip,
			onViz: this.onViz,
			onClick: this.ev.plotClick,
			column: _.getIn(columns, [id])
		}));

		return (
			<div className="Columns">
				<Sortable onClick={this.ev.click} setOrder={this.setOrder}>
					{columnViews}
				</Sortable>
				<div
					style={{height: height}}
					className='addColumn Column'>

					{cohort &&
					<Button
						bsStyle= "primary"
						onClick={() => this.setState({openColumnEdit: true})}
						className='Column-add-button'
						title='Add a column'>
						+ Data
					</Button>}
				</div>
				{editor}
				{settings}
				<Crosshair {...this.state.crosshair} dims={this.state.dims}/>
				<Tooltip {...this.state.tooltip}/>
			</div>
		);
	}
});

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
					<Columns {...this.props}/>
					{zoomHelper}
				</Col>
			</Row>
		);
	}
});
module.exports = Spreadsheet;
