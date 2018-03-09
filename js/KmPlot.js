'use strict';

require('./km.css');
var _ = require('./underscore_ext');
var React = require('react');
var { PropTypes } = React;
import {Button} from 'react-toolbox/lib/button';

import Dialog from 'react-toolbox/lib/dialog';

var Axis = require('./Axis');
var {deepPureRenderMixin} = require('./react-utils');
var {linear, linearTicks} = require('./scale');
var pdf = require('./kmpdf');
var NumberForm = require('./views/NumberForm');

// Basic sizes. Should make these responsive. How to make the svg responsive?
var margin = {top: 20, right: 30, bottom: 30, left: 50};
const HOVER = 'hover';

// XXX point at 100%? [xdomain[0] - 1, 1]
function line(xScale, yScale, values) {
	var coords = values.map(({t, s}) => [xScale(t), yScale(s)]);
	return ['M0,0', ...coords.map(([t, s]) => `H${t}V${s}`)].join(' ');
}

function censorLines(xScale, yScale, censors, className) {
	return censors.map(({t, s}, i) =>
		<line
			key={i}
			className={className}
			x1={0} x2={0} y1={-5} y2={5}
			transform={`translate(${xScale(t)},${yScale(s)})`} />
	);
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
	shouldComponentUpdate: function(newProps) {
		return !_.isEqual(_.omit(newProps, 'xScale', 'yScale'), _.omit(this.props, 'xScale', 'yScale'));
	},

	render: function() {
		let {xScale, yScale, g, setActiveLabel, isActive} = this.props;
		let [color, label, curve] = g;
		var censors = curve.filter(pt => !pt.e);
		let activeLabelClassName = isActive ? HOVER : '';

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
		let [, label] = g;
		// passing bounds to force update when scales change
		return (<LineGroup
				key={index}
				bounds={[xdomain, xrange, ydomain, yrange]}
				xScale={xScale}
				yScale={yScale}
				g={g}
				isActive={label === activeLabel}
				setActiveLabel={setActiveLabel}/>);
	});

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
						y='5'
						x={-height + 5}
						dy='.71em'
						textAnchor='start'>
						Survival probability
					</text>
				</Axis>
				{groupSvg}
			</g>
		</svg>
	);
}

var formatPValue = v => v == null ? String.fromCharCode(8709) : v.toPrecision(4);

var WarningTrigger = React.createClass({
	getInitialState() {
		return { show: false };
	},

	close: function() {
		this.setState({show: false}).bind(this);
	},

	render() {
		let {header, body} = this.props;

		return (
			<div className={"warningContainer"}>
				<Button
					onClick={() => this.setState({show: true})}
					className={"showPWarningButton"}
				>
					<span className="glyphicon glyphicon-warning-sign pWarningIcon"/>
				</Button>
				{this.state.show ? <WarningDialog onHide={this.close} header={header} body={body}/> : null}
			</div>
		);
	}
});

var WarningDialog = React.createClass({

	componentDidMount: function() {
		var body = document.getElementById("body");
		body.style.overflow = "auto";
	},

	render() {

		const actions = [
			{
				label: <i className='material-icons'>close</i>,
				className: "warningDialogClose",
				onClick: this.props.onHide
			},
		];

		return (
			<Dialog
				actions={actions}
				active={true}
				title={this.props.header}
				className={"kmWarningDialog"}
				onEscKeyDown={this.props.onHide}
				onOverlayClick={this.props.onHide}
				theme={{
					wrapper: 'dialogWrapper',
					overlay: 'dialogOverlay'}}>
				{this.props.body}
			</Dialog>
		);
	}
});


var PValue = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {logRank, pValue, patientWarning} = this.props;
		return (
			<div>
				<div className={"PValueArea"}>
					<div className={"PValueP"}><i>P</i>-value = {formatPValue(pValue)}</div>
					{patientWarning ?
						<WarningTrigger
							header="P value warning"
							body={patientWarning}
						/> : null}
				</div>
				<div>
					<span>Log-rank test statistics = {formatPValue(logRank)}</span>
				</div>
			</div>
		);
	}
});

// Sample count is 'n' at 1st time point.
function sampleCount(curve) {
	return _.getIn(curve, [0, 'n'], String.fromCharCode(8709));
}

function makeLegendKey([color, curves, label], setActiveLabel, activeLabel) {
	// show colored line and category of curve
	let isActive = checkIfActive(label, activeLabel);
	let activeLabelClassName = isActive ? 'grey' : '';
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
			className={`kmListItem ${activeLabelClassName}`}
			onMouseOver={(e) => setActiveLabel(e, label)}
			onMouseOut={(e) => setActiveLabel(e, '')}>
			<span style={legendLineStyle}/> {label} (n={sampleCount(curves)})
		</li>

	);
}

var Legend = React.createClass({
	mixins: [deepPureRenderMixin],
	propTypes: {
		activeLabel: PropTypes.string,
		columns: PropTypes.number,
		groups: PropTypes.object,
		setActiveLabel: PropTypes.func
	},

	render: function () {
		let { groups, setActiveLabel, activeLabel } = this.props;
		let {colors, curves, labels} = groups;
		let sets = _.zip(colors, curves, labels)
				.map(set => makeLegendKey(set, setActiveLabel, activeLabel));

		return (
			<div className="legend">{sets}</div>
		);
	}
});

function makeGraph(groups, setActiveLabel, activeLabel, size) {
	return (
		<div className="graph" style={{width: 0.9 * size.width}}>
			{svg(groups, setActiveLabel, activeLabel, {height: 0.8 * size.height, width: 0.9 * size.width})}
			<div className='kmScreen'/>
		</div>
	);
}

function makeSplits(splits, onSplits) {
	return (
		<form>
			<div>
				<label className={"kmSplitLabel"}>
					<input value={2} type="radio" name="splits" checked={splits === 2} onChange={onSplits}/>
					<span className={"kmSplitHint"}>2 groups</span>
				</label>
				<label className={"kmSplitLabel"}>
					<input value={3} type="radio" name="splits" checked={splits === 3} onChange={onSplits}/>
					<span className={"kmSplitHint"}>3 groups</span>
				</label>
			</div>
		</form>);
}

function makeDefinitions(groups, setActiveLabel, activeLabel, size, maySplit, splits, onSplits) {
	// get new size based on size ratio for definitions column

	return (
		<div className="definitions" style={{width: size.width}}>
			<PValue pValue={groups.pValue} logRank={groups.KM_stats}
				patientWarning={groups.patientWarning}/>
			<br/>
			{maySplit ? makeSplits(splits, onSplits) : null}
			<br/>
			<Legend groups={groups}
					setActiveLabel={setActiveLabel}
					activeLabel={activeLabel}/>
		</div>
	);
}

var KmPlot = React.createClass({
	mixins: [deepPureRenderMixin],
	propTypes: {
		eventClose: PropTypes.string,
		dims: PropTypes.object
	},
	size: {
		ratios: {
			graph: {
				width: 0.75,
				height: 1.0
			},
			definitions: {
				width: 0.4,
				height: 1.0
			}
		}
	},

	getDefaultProps: () => ({
		eventClose: 'km-close',
		dims: {
			height: 450,
			width: 700
		}
	}),

	getInitialState: function () {
		return { activeLabel: '' };
	},

	hide: function () {
		let {callback, eventClose} = this.props;
		callback([eventClose]);
	},

	// cutoff needs to rewrite the group calc, but we need
	// the full range in order to range-check the bound. So
	// the compute should stash the domain.
	onCutoff: function (v) {
		let {callback} = this.props;
		callback(['km-cutoff', v]);
	},

	setActiveLabel: function (e, label) {
		this.setState({ activeLabel: label });
	},

	pdf: function () {
		pdf(this.props.km.groups);
	},

	help: function () {
		window.location.href = "http://xena.ucsc.edu/km-plot-help/";
	},

	onSplits(ev) {
		var {callback} = this.props;
		callback(['km-splits', parseInt(ev.target.value, 10)]);
	},

	componentDidMount: function() {
		var body = document.getElementById("body");
		body.style.overflow = "auto";
	},

	render: function () {
		let {km: {splits = 2, title, label, groups, cutoff}, dims} = this.props,
			// groups may be undefined if data hasn't loaded yet.
			maySplit = _.get(groups, 'maySplit', false),
			min = _.getIn(groups, ['domain', 0]),
			max = _.getIn(groups, ['domain', 1]),
			warning = _.get(groups, 'warning'),
			fullLabel = warning ? `${label} (${warning})` : label,
			{activeLabel} = this.state,
			sectionDims = calcDims(dims, this.size.ratios);

		let Content = _.isEmpty(groups)
			? <div
				style={{
					height: dims.height,
					textAlign: 'center',
					verticalAlign: 'center'
				}}>
				<h1>Loading...</h1>
			</div>
			: (_.isEmpty(groups.colors)
					? <div><h3>Unfortunately, KM plot can not be made. There is no survival data overlapping column
						data.</h3></div>
					: <div>
						<Button onClick={this.pdf} className={"kmPDFButton"}>
							<span className="glyphicon glyphicon-download kmButtonIcon"/>
							PDF
						</Button>
						<Button onClick={this.help} className={"kmHelpButton"}>
							<span className={"glyphicon glyphicon-question-sign kmButtonIcon"}/>
							Help
						</Button>
						{makeGraph(groups, this.setActiveLabel, activeLabel, sectionDims.graph)}
						{makeDefinitions(groups, this.setActiveLabel, activeLabel, sectionDims.definitions, maySplit, splits, this.onSplits)}
						<div style={{clear: 'both'}}>
							<NumberForm
								onChange={this.onCutoff}
								dflt={max}
								min={min}
								max={max}
								initialValue={cutoff}/>
						</div>
						<samp className='featureLabel'>{fullLabel}</samp>
					</div>
			);

		const actions = [
			{
				label: <i className='material-icons'>close</i>,
				className: "kmDialogClose",
				onClick: this.hide
			},
		];
		return (
			<div>
				<Dialog
					actions={actions}
					active={true}
					title={'Kaplan Meier' + title}
					className={"kmDialog"}
					onEscKeyDown={this.hide}
					onOverlayClick={this.hide}
					theme={{
						wrapper: 'dialogWrapper',
						overlay: 'dialogOverlay'}}>
					{Content}
				</Dialog>
			</div>
		);
	}
});

module.exports = {KmPlot};
