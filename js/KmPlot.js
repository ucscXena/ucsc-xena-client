/*eslint-env browser */
/*global require: false, module: false */

'use strict';

require('../css/km.css');
var _ = require('./underscore_ext');
//var warningImg = require('../images/warning.png');
var React = require('react');
var { PropTypes } = React;
var Modal = require('react-bootstrap/lib/Modal');
var { ListGroup, ListGroupItem, Row, Col, OverlayTrigger, Tooltip } = require('react-bootstrap/lib/');
var Col = require('react-bootstrap/lib/Col');
var Axis = require('./Axis');
var {deepPureRenderMixin} = require('./react-utils');
var {linear, linearTicks} = require('./scale');
// XXX Warn on duplicate patients, and list patient ids?

// Basic sizes. Should make these responsive. How to make the svg responsive?
//var size = {width: 800, height: 450};
var margin = {top: 20, right: 50, bottom: 30, left: 50};
const HOVER = 'hover';

// XXX point at 100%? [xdomain[0] - 1, 1]
function line(xScale, yScale, values) {
	var coords = values.map(({t, s}) => [xScale(t), yScale(s)]);
	return ['M0,0', ...coords.map(([t, s]) => `H${t}V${s}`)].join(' ');
}

function isActiveLabel(activeLabel, currentLabel) {
	if (activeLabel)
		return (activeLabel === currentLabel);
	else
		return false;
}

function censorLines(xScale, yScale, censors, className) {
	/*eslint-disable comma-spacing */
	return censors.map(({t, s}, i) =>
		<line
			key={i}
			className={className}
			x1={0} x2={0} y1={-5} y2={5}
			transform={`translate(${xScale(t)},${yScale(s)})`}/>
	);
	/*eslint-enable comma-spacing */
}

var drawGroup = function (xScale, yScale, [color, label, curve], setActiveLabel, activeLabel) {
	var censors = curve.filter(pt => !pt.e);
	let activeLabelClassName = isActiveLabel(activeLabel, label) ? HOVER : '';

	return (
		<g key={label} className='subgroup' stroke={color}
		   onMouseOver={(e) => setActiveLabel(e, label)}
		   onMouseOut={(e) => setActiveLabel(e, '')}>
			<path className={`outline ${activeLabelClassName}`} d={line(xScale, yScale, curve)}/>
			<path className={`line ${activeLabelClassName}`} d={line(xScale, yScale, curve)}/>
			{censorLines(xScale, yScale, censors, `outline ${activeLabelClassName}`)}
			{censorLines(xScale, yScale, censors, `line' ${activeLabelClassName}`)}
		</g>);
}

var bounds = x => [_.min(x), _.max(x)];

function svg({colors, labels, curves}, setActiveLabel, activeLabel, size) {
	var height = size.height - margin.top - margin.bottom,
	//width = size.width - margin.left - margin.right,
		width = size.width,
		xdomain = bounds(_.pluck(_.flatten(curves), 't')),
		xrange = [0, width],
		ydomain = [0, 1],
		yrange = [height, 0],
		xScale = linear(xdomain, xrange),
		yScale = linear(ydomain, yrange);

	var groupSvg = _.zip(colors, labels, curves).map(g => drawGroup(xScale, yScale, g, setActiveLabel, activeLabel));

	/*eslint-disable comma-spacing */
	return (
		<svg width={width} height={size.height}>
			<g transform={`translate(${margin.left}, ${margin.top})`}>
				<Axis
					groupProps={{
						className: 'x axis',
						transform: `translate(0, ${height})`
					}}
					domain={xdomain}
					range={xrange}
					scale={xScale}
					tickfn={linearTicks}
					orientation='bottom'
				/>
				<Axis
					groupProps={{
						className: 'y axis'
					}}
					domain={ydomain}
					range={yrange}
					scale={yScale}
					tickfn={linearTicks}
					orientation='left'>

					<text
						transform='rotate(-90)'
						y='6'
						x={-height}
						dy='.71em'
						textAnchor='start'>
						Survival percentage
					</text>
				</Axis>
				{groupSvg}
			</g>
		</svg>
	);
	/*eslint-enable comma-spacing */
}

var PValue = React.createClass({
	render: function () {
		const tooltip = (
			<Tooltip id='p-value' placement='top'>
				Some individuals survival data are used more than once in the KM plot. Affected patients are:
				TCGA-G4-6317-02,
				TCGA-A6-2671-01, TCGA-A6-2680-01, TCGA-A6-2684-01, TCGA-A6-2685-01, TCGA-A6-2683-01, TCGA-AA-3520-01,
				TCGA-AA-3525-01. For more information and how to remove such duplications: https://goo.gl/TSQt6z.
			</Tooltip>
		);

		return (
			<ListGroup fill>
				<ListGroupItem>
					<OverlayTrigger
						placement='right'
						overlay={tooltip}
						trigger={['hover', 'click']}>
						<div className="badge" style={{verticalAlign:"middle"}}>!</div>
					</OverlayTrigger>
					<span>P-Value = 0.00023</span>
				</ListGroupItem>
				<ListGroupItem>
					<span>Log-rank Test Stats = 0.0000</span>
				</ListGroupItem>
			</ListGroup>
		)
	}
});

function makeLegendKey([color, curves, label], setActiveLabel, activeLabel) {
	// show colored line and category of curve
	let activeLabelClassName = isActiveLabel(activeLabel, label) ? HOVER : '';
	let legendLineStyle = {
		backgroundColor: color,
		border: '1px solid',
		display: 'inline-block',
		height: 5,
		width: 25,
		verticalAlign: 'middle'
	};

	return (
		<li
			key={label}
			className={`list-group-item outline ${activeLabelClassName}`}
			onMouseOver={(e) => setActiveLabel(e, label)}
			onMouseOut={(e) => setActiveLabel(e, '')}>
			<span style={legendLineStyle}/> {label} (n={curves.length})
		</li>

	);
}

var Legend = React.createClass({
	propTypes: {
		activeLabel: PropTypes.string,
		columns: PropTypes.number,
		groups: PropTypes.object,
		setActiveLabel: PropTypes.func
	},

	render: function () {
		let { groups, setActiveLabel, activeLabel } = this.props;
		let { colors, curves, labels } = groups;
		let sets = _.zip(colors, curves, labels).map((set, index) => makeLegendKey(set, setActiveLabel, activeLabel));

		return (
			<ListGroup className="legend">{sets}</ListGroup>
		);
	}
});

function Graph(groups, setActiveLabel, activeLabel, size) {
	return (
		<div className="graph" style={{width: size.width}}>
			{svg(groups, setActiveLabel, activeLabel, size)}
			<div className='kmScreen'/>
		</div>
	);
}

function Definitions(groups, setActiveLabel, activeLabel, size) {
	// get new size based on size ratio for definitions column

	return (
		<div className="definitions" style={{width: size.width}}>
			<PValue />
			<Legend groups={groups}
					setActiveLabel={setActiveLabel}
					activeLabel={activeLabel}/>
		</div>
	);
}

var KmPlot = React.createClass({
	mixins: [deepPureRenderMixin],
	size: {
		dims: null,
		ratios: {
			graph: {
				width: 0.75,
				height: 1.0
			},
			definitions: {
				width: 0.0,
				height: 1.0
			}
		}
	},
	propTypes: {
		eventClose: PropTypes.string,
		dims: PropTypes.object
	},

	getDefaultProps: () => ({
		eventClose: 'km-close',
		dims: {
			height: 450,
			width: 860
		}
	}),

	getInitialState: () => ({
		activeLabel: ''
	}),

	componentWillMount: function () {
		// calculate width ratio of definitions section && calculate dimensions for each section based on ratios
		this.size.ratios.definitions.width = 1 - this.size.ratios.graph.width;
		this.size.dims = this.calcDims(this.props.dims);
	},

	componentWillUpdate: function(newProps, newState) {
		this.size.dims = this.calcDims(newProps.dims);
	},

	calcDims: function (viewDims) {
		let dims = {};

		_.each(this.size.ratios, (sectionRatios, sectionName) => {
			dims[sectionName] = _.mapObject(sectionRatios, (ratio, param) => {
				return ratio * viewDims[param];
			});
		});

		return dims;
	},

	hide: function () {
		let {callback, eventClose} = this.props;
		callback([eventClose]);
	},

	setActiveLabel: function (e, label) {
		this.setState({activeLabel: label});
	},

	render: function () {
		//debugger;
		let { km: {title, label, groups} } = this.props,
			{ activeLabel } = this.state,
			{ dims } = this.size;
		// XXX Use bootstrap to lay this out, instead of tables + divs
		let Content = _.isEmpty(groups)
			?
			<div className="jumbotron"
				 style={{height: this.props.dims.height, textAlign: 'center', verticalAlign: 'center'}}>
				<h1>Loading...</h1>
			</div>
			: <div>
			{Graph(groups, this.setActiveLabel, activeLabel, dims.graph)}
			{Definitions(groups, this.setActiveLabel, activeLabel, dims.definitions)}
		</div>;

		return (
			<Modal show={true} bsSize='large' className='kmDialog' onHide={this.hide} ref="kmPlot">
				<Modal.Header closeButton className="container-fluid">
					<span className="col-md-2">
						<Modal.Title>Kaplar Meier</Modal.Title>
					</span>
					<span className="col-md-9 label label-default featureLabel">{title}</span>
				</Modal.Header>
				<Modal.Body className="container-fluid">
					{Content}
				</Modal.Body>
				<Modal.Footer>
					<div className='featureLabel'>{label}</div>
				</Modal.Footer>
			</Modal>
		);
	}
});

module.exports = KmPlot;
