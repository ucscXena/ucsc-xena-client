/*eslint-env browser */
/*global require: false, module: false */

'use strict';

require('../css/km.css');
var _ = require('./underscore_ext');
var React = require('react');
var {PropTypes} = React;
var {Glyphicon, ListGroup, ListGroupItem, OverlayTrigger, Tooltip} = require('react-bootstrap/lib/');
var Axis = require('./Axis');
var Select = require('./views/Select');
var {deepPureRenderMixin} = require('./react-utils');
var {linear, linearTicks} = require('./scale');
// XXX Warn on duplicate patients, and list patient ids?

// Basic sizes. Should make these responsive. How to make the svg responsive?
var margin = {top: 20, right: 10, bottom: 30, left: 50};
const HOVER = 'hover';

// XXX point at 100%? [xdomain[0] - 1, 1]
function line(xScale, yScale, values) {
	var coords = values.map(({t, s}) => [xScale(t), yScale(s)]);
	return ['M0,0', ...coords.map(([t, s]) => `H${t}V${s}`)].join(' ');
}

function censorLines(xScale, yScale, censors, className) {
	/*eslint-disable comma-spacing */
	return censors.map(({t, s}, i) =>
		<line
			key={i}
			className={className}
			x1={0} x2={0} y1={-5} y2={5}
			transform={`translate(${xScale(t)},${yScale(s)})`} />
	);
	/*eslint-enable comma-spacing */
}

function calcDims (viewDims, sizeRatios) {
	return _.mapObject(sizeRatios, (section) => {
		return _.mapObject(section, (ratio, side) => viewDims[side] * ratio);
	});
}

function checkIfActive(currentLabel, activeLabel) {
	// check whether this line group should be set to Active
	return !!activeLabel && (activeLabel === currentLabel);
}

var LineGroup = React.createClass({
	getInitialState: function() {
		return { isActive: false }
	},

	componentWillReceiveProps: function(newProps) {
		var { g, activeLabel } = newProps,
			[ , label, ] = g,
			oldIsActive = this.state.isActive,
			activeStatus = checkIfActive(label, activeLabel);

		if (oldIsActive !== activeStatus) {
			this.setState({ isActive: activeStatus });
		}
	},

	shouldComponentUpdate: function(newProps, newState) {
		//testing for any changes to g, and state's isActive parameter should be sufficient
		var gChanged = !_.isEqual(newProps.g, this.props.g),
			isActiveChanged = !_.isEqual(newState.isActive, this.state.isActive);

		return (gChanged || isActiveChanged);
	},

	render: function() {
		var { xScale, yScale, g, setActiveLabel } = this.props,
			[ color, label, curve ] = g,
			censors = curve.filter(pt => !pt.e),
			activeLabelClassName = this.state.isActive ? HOVER : '';

		return (
			<g key={label} className='subgroup' stroke={color}
				onMouseOver={(e) => setActiveLabel(e, label)}
				onMouseOut={(e) => setActiveLabel(e, '')}>
				<path className={`outline ${activeLabelClassName}`} d={line(xScale, yScale, curve)}/>
				<path className={`line ${activeLabelClassName}`} d={line(xScale, yScale, curve)}/>
				{censorLines(xScale, yScale, censors, `outline ${activeLabelClassName}`)}
				{censorLines(xScale, yScale, censors, `line' ${activeLabelClassName}`)}
			</g>
		);
	}
});

var bounds = x => [_.min(x), _.max(x)];
var selectableKmColumns = options =>
		_.map(options, (opt, key) => {
			let labelType = 'user';
			return {
				label: `${opt.columnLabel[labelType]} ${opt.fieldLabel[labelType]}`,
				value: key
			};
		})

function svg({colors, labels, curves}, setActiveLabel, activeLabel, size) {
	var height = size.height - margin.top - margin.bottom,
		width = size.width - margin.left - margin.right,
		xdomain = bounds(_.pluck(_.flatten(curves), 't')),
		xrange = [0, width],
		ydomain = [0, 1],
		yrange = [height, 0],
		xScale = linear(xdomain, xrange),
		yScale = linear(ydomain, yrange);

	var groupSvg = _.zip(colors, labels, curves).map((g, index) => {
		return (<LineGroup
				key={index}
				xScale={xScale}
				yScale={yScale}
				g={g}
				activeLabel={activeLabel}
				setActiveLabel={setActiveLabel} />);
	});

	/*eslint-disable comma-spacing */
	return (
		<svg width={size.width} height={size.height}>
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

var formatPValue = v => v == null ? String.fromCharCode(8709) : v.toPrecision(4);

var PValue = React.createClass({
	render: function () {
		var {logRank, pValue, patientWarning} = this.props;
		const tooltip = (
			<Tooltip id='p-value' placement='top'>
				{patientWarning}
			</Tooltip>
		);

		return (
			<ListGroup fill>
				<ListGroupItem>
					{patientWarning ?
					<OverlayTrigger
						placement='right'
						overlay={tooltip}
						trigger={['hover', 'click']}>
						<span className='pull-right p-value-warning'>
							<Glyphicon glyph='warning-sign'/>
						</span>
					</OverlayTrigger> :
					null}
					<span>P-Value = {formatPValue(pValue)}</span>
				</ListGroupItem>
				<ListGroupItem>
					<span>Log-rank Test Stats = {formatPValue(logRank)}</span>
				</ListGroupItem>
			</ListGroup>
		)
	}
});

// Sample count is 'n' at 1st time point.
function sampleCount(curve) {
	return _.getIn(curve, [0, 'n'], String.fromCharCode(8709));
}

function makeLegendKey([color, curves, label], setActiveLabel, activeLabel) {
	// show colored line and category of curve
	let isActive = checkIfActive(label, activeLabel),
		activeLabelClassName = isActive ? HOVER : '';
	let legendLineStyle = {
		backgroundColor: color,
		border: (isActive ? 2 : 1).toString() + 'px solid',
		display: 'inline-block',
		height: 6,
		width: 25,
		verticalAlign: 'middle'
	};

	return (
		<li
			key={label}
			className={`list-group-item outline ${activeLabelClassName}`}
			onMouseOver={(e) => setActiveLabel(e, label)}
			onMouseOut={(e) => setActiveLabel(e, '')}>
			<span style={legendLineStyle} /> {label} (n={sampleCount(curves)})
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
		let { groups, setActiveLabel, activeLabel } = this.props,
			{ colors, curves, labels } = groups,
			sets = _.zip(colors, curves, labels)
					.map(set => makeLegendKey(set, setActiveLabel, activeLabel));
		return (
			<ListGroup className="legend">{sets}</ListGroup>
		);
	}
});

function makeGraph(groups, setActiveLabel, activeLabel, size) {
	return (
		<span className="graph" style={{width: size.width}}>
			{svg(groups, setActiveLabel, activeLabel, size)}
			<div className='kmScreen'/>
		</span>
	);
}

function makeDefinitions(groups, setActiveLabel, activeLabel, size) {
	// get new size based on size ratio for definitions column
	return (
		<span className="definitions" style={{width: size.width}}>
			<PValue pValue={groups.pValue} logRank={groups.KM_stats}
				patientWarning={groups.patientWarning}/>
			<Legend groups={groups}
					setActiveLabel={setActiveLabel}
					activeLabel={activeLabel} />
		</span>
	);
}

var KmPlot = React.createClass({
	name: 'kmPlot',
	mixins: [deepPureRenderMixin],
	propTypes: {
		eventClose: PropTypes.string,
		dims: PropTypes.object
	},
	size: {
		ratios: {
			controls: {
				width: 0.2,
				height: 1.0
			},
			definitions: {
				width: 0.2,
				height: 1.0
			},
			graph: {
				width: 0.6,
				height: 1.0
			}
		}
	},
	getDefaultProps: () => ({
		eventClose: 'km-close',
		dims: {
			height: 450,
			width: 960
		}
	}),
	getInitialState: function() {
		return {activeLabel: '', dims: null}
	},
	componentDidMount: function() {
		this.setState({
			dims: {
				height: this.refs[this.name].clientHeight,
				width: this.refs[this.name].clientWidth
			}
		});
	},
	onSelectKm: function(kmId) {
		if (kmId !== this.props.activeKm.id) {
			this.props.callback(['km-open', kmId]);
		}
	},
	setActiveLabel: function (e, label) {
		this.setState({ activeLabel: label });
	},
	render: function () {
		var {activeKm: {groups, id, label, title}, callback, kmColumns} = this.props,
			warning = _.get(groups, 'warning'),
			fullLabel = warning ? `${label} (${warning})` : label,
			{activeLabel}  = this.state,
			dims = this.state.dims || this.props.dims,
			sectionDims = calcDims(dims, this.size.ratios);
		// XXX Use bootstrap to lay this out, instead of tables + divs
		var Content = _.isEmpty(groups)
			? <div
				className="jumbotron"
				style={{
					height: dims.height,
					textAlign: 'center',
					verticalAlign: 'center'
				}}>
				<h1>Loading...</h1>
			</div>
			: <div className="container row">
				<span className="controls" style={{width: sectionDims.controls.width}}>
					<div className="row">
						<h2><small>Stratification</small></h2>
						<Select options={selectableKmColumns(kmColumns)}
								onSelect={this.onSelectKm} value={id} charLimit={32}/>
						<div>
							<hr />
						</div>
					</div>
				</span>
				{makeGraph(groups, this.setActiveLabel, activeLabel, sectionDims.graph)}
				{makeDefinitions(groups, this.setActiveLabel, activeLabel, sectionDims.definitions)}
			</div>;
		return (
			<div className='kmDialog container-fluid' ref="kmPlot">{Content}</div>
		);
	}
});

module.exports = KmPlot;
