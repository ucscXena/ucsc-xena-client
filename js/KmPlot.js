import kmStyle from "./km.module.css";
var _ = require('./underscore_ext').default;
import PureComponent from './PureComponent';
var React = require('react');
import {Button} from 'react-toolbox/lib/button';
import Dropdown from 'react-toolbox/lib/dropdown';
import Dialog from 'react-toolbox/lib/dialog';
import Tooltip from 'react-toolbox/lib/tooltip';
// XXX move this file out of chart directory
import {el, div, h1, h3, label, span} from './chart/react-hyper';

var Axis = require('./Axis');
var {linear, linearTicks} = require('./scale');
var pdf = require('./kmpdf');
var NumberForm = require('./views/NumberForm');
var {survivalOptions, getSplits} = require('./models/km');
var gaEvents = require('./gaEvents');

var TTIcon = Tooltip(props => <i {..._.omit(props, 'theme')} />);

// XXX there's overlap here with react-toolbox IconButton. Not sure
// why we need both. Copied this pattern from AppControls, so it would
// match.
var icon = (i, tooltip, onClick) =>
	<TTIcon className='material-icons'
		onClick={onClick}
		tooltip={tooltip}>{i}</TTIcon>;

var iconLink = (i, href) =>
	<a href={href} target='_blank'><i className='material-icons'>{i}</i></a>;

var kmHelpURL = 'https://ucsc-xena.gitbook.io/project/overview-of-features/kaplan-meier-plots';

// Basic sizes. Should make these responsive. How to make the svg responsive?
var margin = {top: 20, right: 80, bottom: 30, left: 50};

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

var groupClass = (i, x = '') => i == null ? null : kmStyle['group' + x + i];

class LineGroup extends React.Component {
	shouldComponentUpdate(newProps) {
		return !_.isEqual(_.omit(newProps, 'xScale', 'yScale'), _.omit(this.props, 'xScale', 'yScale'));
	}

	render() {
		let {i, groups, xScale, yScale, onMouse} = this.props,
			{colors, labels, curves} = groups,
			censors = curves[i].filter(pt => !pt.e);

		return (
			<g key={labels[i]} data-group={i} className={kmStyle.subgroup + ' ' + groupClass(i)}
					stroke={colors[i]} onMouseOver={onMouse} onMouseOut={onMouse}>
				<path className={kmStyle.outline} d={line(xScale, yScale, curves[i])}/>
				<path className={kmStyle.line} d={line(xScale, yScale, curves[i])}/>
				{censorLines(xScale, yScale, censors, kmStyle.outline)}
				{censorLines(xScale, yScale, censors, kmStyle.line)}
			</g>
		);
	}
}

var bounds = x => [_.min(x), _.max(x)];

function getPlotDims({curves}, size) {
	var height = size.height - margin.top - margin.bottom,
		width = size.width - margin.left - margin.right,
		xdomain = bounds(_.pluck(_.flatten(curves), 't')),
		xrange = [0, width],
		ydomain = [0, 1],
		yrange = [height, 0];
	return {height, width, xdomain, xrange, ydomain, yrange};
}

function renderKmSVG({groups, size, plotDims, unit, onMouse}) {
	var {height, xdomain, xrange, ydomain, yrange} = plotDims,
		xScale = linear(xdomain, xrange),
		yScale = linear(ydomain, yrange),
		groupSvg = _.times(groups.curves.length, i =>
			// passing bounds to force update when scales change
			(<LineGroup
				key={i}
				i={i}
				groups={groups}
				bounds={[xdomain, xrange, ydomain, yrange]}
				xScale={xScale}
				yScale={yScale}
				onMouse={onMouse}/>));

	return (
		<svg className={kmStyle.graph} width={size.width} height={size.height}>
			<g transform={`translate(${margin.left}, ${margin.top})`}>
				<Axis
					groupProps={{
						className: `x ${kmStyle.axis}`,
						transform: `translate(0, ${height})`
					}}
					domain={xdomain}
					range={xrange}
					scale={xScale}
					tickfn={linearTicks}
					orientation='bottom'>
					{unit ?
						<text
							y='-7'
							x={xrange[1] + 5}
							dy='.71em'
							textAnchor='start'>
							{unit}
						</text> : null}
				</Axis>
				<Axis
					groupProps={{
						className: `y ${kmStyle.axis}`
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

// Using a full component here to cache the rendering during mouseover.
class KmSVG extends PureComponent {
	render() {
		return renderKmSVG(this.props);
	}
}

var kmSVG = el(KmSVG);

var formatPValue = v => v == null ? String.fromCharCode(8709) : v.toPrecision(4);

class WarningTrigger extends React.Component {
	state = { show: false };

	close = () => {
		this.setState({show: false});
	};

	render() {
		let {header, body} = this.props;

		return (
			<div className={kmStyle.warningContainer}>
				<Button
					onClick={() => this.setState({show: true})}
					className={kmStyle.showPWarningButton}>
					<i className={`material-icons ${kmStyle.pWarningIcon}`}>warning</i>
				</Button>
				{this.state.show ? <WarningDialog onHide={this.close} header={header} body={body}/> : null}
			</div>
		);
	}
}

class WarningDialog extends React.Component {
	componentDidMount() {
		document.documentElement.scrollTop = 0;
		var body = document.getElementById("body");
		body.style.overflow = "auto";
	}

	render() {

		const actions = [
			{
				children: [<i className='material-icons'>close</i>],
				className: kmStyle.warningDialogClose,
				onClick: this.props.onHide
			},
		];

		return (
			<Dialog
				actions={actions}
				active={true}
				title={this.props.header}
				className={kmStyle.warningDialog}
				onEscKeyDown={this.props.onHide}
				onOverlayClick={this.props.onHide}
				theme={{
					wrapper: kmStyle.dialogWrapper,
					overlay: kmStyle.dialogOverlay}}>
				{this.props.body}
			</Dialog>
		);
	}
}


class PValue extends PureComponent {
	render() {
		var {logRank, pValue, patientWarning} = this.props;
		return (
			<div>
				<div className={kmStyle.PValueArea}>
					<div className={kmStyle.PValueP}><i>P</i>-value = {formatPValue(pValue)}</div>
					{patientWarning ?
						<WarningTrigger
							header="P value warning"
							body={patientWarning}
						/> : null}
				</div>
				<div>
					Log-rank test statistics = {formatPValue(logRank)}
				</div>
			</div>
		);
	}
}

// Sample count is 'n' at 1st time point.
function sampleCount(curve) {
	return _.getIn(curve, [0, 'n'], String.fromCharCode(8709));
}

function makeLegendKey({colors, curves}, i) {
	// show colored line and category of curve
	let legendLineStyle = {
		backgroundColor: colors[i]
	};

	return (
			<span key={label} className={kmStyle.listItem}>
				<span className={kmStyle.legendLine}
					style={legendLineStyle}/>{label} (n={sampleCount(curves[i])})
			</span>);
}

function makeSurvivalTypeUI(cohort, survType, survivalTypes, onSurvType) {
	return (
		<Dropdown className={kmStyle.survType}
			source = {survivalTypes.map(t => ({
						value: t,
						label: survivalOptions[t].label
					}))}
			value = {survType || survivalTypes[0]}
			onChange={onSurvType} />);
}

// When looking up the at-risk at a particular time, we need
// the first point that is greater than or equal to time t.
// If t is after the last point, at-risk is zero.
var atRisk = (curve, t) => {
	var p = curve.find(p => p.t >= t);
	return p ? p.n : 0;
};
var atRiskSpan = curve => t => span(atRisk(curve, t).toString());

function renderRiskTable({groups, groupLabel, clarification, warning, onMouse,
		plotDims}) {
	var {curves} = groups,
		{xdomain, xrange} = plotDims,
		xScale = linear(xdomain, xrange),
		ticks = linearTicks(...xdomain),
		// note that our scales clip, so we can't project beyond
		// the domain. Instead, project from within the domain.
		// XXX Why should xdomain start at zero? It doesn't make sense.
		x0 = xScale(ticks[0]),
		x1 = xScale(ticks[1]),
		cellWidth = x1 - x0,
		maxX = cellWidth * ticks.length,
		leftMargin = {marginLeft: margin.left + x0 - cellWidth / 2},
		rowStyle = {style: {width: maxX}};

	return div({className: kmStyle.atRisk, style: leftMargin},
			div(div(rowStyle, 'At risk'),
				div(label(groupLabel, clarification && ` ${clarification}`))),
			..._.times(curves.length, i =>
				div({className: groupClass(i), 'data-group': i, onMouseOut: onMouse, onMouseOver: onMouse},
					div(rowStyle, ...ticks.map(atRiskSpan(curves[i]))),
					makeLegendKey(groups, i))),
			...(warning ? [div(div(rowStyle), div(warning))] : []));
}

class RiskTable extends PureComponent {
	render() {
		return renderRiskTable(this.props);
	}
}

var riskTable = el(RiskTable);

function makeSplits(splits, onSplits) {
	return (
		<form>
			<div className={kmStyle.splits}>
				<label className={kmStyle.splitLabel} title='2 groups: top 50%, bottom 50%'>
					<input value={2} type="radio" name="splits" checked={splits === 2} onChange={onSplits}/>
					<span className={kmStyle.splitHint}>2 groups</span>
				</label>
				<label className={kmStyle.splitLabel} title='3 groups: top 33%, middle 33%, bottom 33%'>
					<input value={3} type="radio" name="splits" checked={splits === 3} onChange={onSplits}/>
					<span className={kmStyle.splitHint}>3 groups</span>
				</label>
				<label className={kmStyle.splitLabel} title='Quartiles: top 25%, bottom 25%'>
					<input value={-4} type="radio" name="splits" checked={splits === -4} onChange={onSplits}/>
					<span className={kmStyle.splitHint}>Quartiles</span>
				</label>
			</div>
		</form>);
}

function makeDefinitions(groups, maySplit, splits, onSplits) {
	// get new size based on size ratio for definitions column
	return (
		<div className={kmStyle.definitions}>
			<PValue pValue={groups.pValue} logRank={groups.KM_stats}
				patientWarning={groups.patientWarning}/>
			<br/>
			{maySplit ? makeSplits(getSplits(splits), onSplits) : null}
		</div>
	);
}

class KmPlot extends PureComponent {
	static defaultProps = {
		eventClose: 'km-close',
		dims: {
			height: 360,
			width: 522.5
		}
	};

	state = { activeLabel: '' };

	hide = () => {
		let {callback, eventClose} = this.props;
		callback([eventClose]);
	};

	// cutoff needs to rewrite the group calc, but we need
	// the full range in order to range-check the bound. So
	// the compute should stash the domain.
	onCutoff = (v) => {
		let {callback} = this.props;
		callback(['km-cutoff', v]);
	};

	setActiveLabel = (e, label) => {
		this.setState({ activeLabel: label });
	};

	onPdf = () => {
		gaEvents('spreadsheet', 'pdf', 'km');
		pdf(this.props.km.groups);
	};

	onDownload = () => {
		gaEvents('spreadsheet', 'download', 'km');
		var data = this.props.km.groups.download(),
			keys = Object.keys(data);


		var txt = [keys.join('\t')].concat(data[keys[0]].map((v, i) => keys.map(k => data[k][i]).join('\t'))).join('\n');
		// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
		var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
		var a = document.createElement('a');
		var filename = 'survival.tsv';
		_.extend(a, { id: filename, download: filename, href: url });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	onSplits = (ev) => {
		var {callback} = this.props;
		callback(['km-splits', parseInt(ev.target.value, 10)]);
	};

	onSurvType = (ev) => {
		var {callback} = this.props;
		callback(['km-survivalType', ev]);
	};

	componentDidMount() {
		document.documentElement.scrollTop = 0;
		var body = document.getElementById("body");
		body.style.overflow = "auto";
	}

	renderLoading() {
		var style = {
			height: this.props.dims.height,
			textAlign: 'center',
			verticalAlign: 'center'
		};
		return div({style}, h1('Loading...'));
	}

	onMouse = ev => {
		var group = _.getIn(ev, ['currentTarget', 'dataset', 'group']);
		if (group) {
			this.setState({activeGroup: ev.type === 'mouseout' ? null : group});
		}
	}

	renderNoOverlap() {
		var {km: {survivalType}, survivalKeys, cohort} = this.props,
			survivalTypes = _.intersection(survivalKeys, _.keys(survivalOptions)),
			msg = 'Unfortunately, KM plot can not be made. There is no survival data overlapping column data.';
		return div(
				div(makeSurvivalTypeUI(cohort, survivalType, survivalTypes,
						this.onSurvType)),
				div(h3(msg)));
	}

	renderPlot() {
		let {km: {splits = 2, label, groups, cutoff, survivalType},
				survivalKeys, cohort, dims} = this.props,
			{unit, maySplit, warning, clarification, domain: [min, max]} = groups,
			{activeGroup} = this.state,
			gClass = groupClass(activeGroup, 'Highlight'),
			survivalTypes = _.intersection(survivalKeys, _.keys(survivalOptions)),
			plotDims = getPlotDims(groups, dims);
		return (
			<div className={gClass}>
				<div className={kmStyle.topPanel}>
					{kmSVG({groups, onMouse: this.onMouse, size: dims, plotDims, unit})}
					<div className={kmStyle.rightPanel}>
						<div className={kmStyle.actions}>
							{icon('picture_as_pdf', 'Download as PDF', this.onPdf)}
							{icon('cloud_download', 'Download as tsv', this.onDownload)}
							{iconLink('help', kmHelpURL)}
						</div>
						<h4>{label}</h4>
						{makeDefinitions(groups,
							maySplit, splits, this.onSplits, label, clarification, warning)}
						{makeSurvivalTypeUI(cohort, survivalType, survivalTypes, this.onSurvType)}
						<NumberForm
							onChange={this.onCutoff}
							dflt={max}
							min={min}
							max={max}
							initialValue={cutoff}/>
					</div>
				</div>
				{riskTable({groups, groupLabel: label, clarification, warning,
							   onMouse: this.onMouse, plotDims})}
			</div>);
	}

	render() {
		let {km: {title, groups}} = this.props,
			Content =
				_.isEmpty(groups) ? this.renderLoading() :
				_.isEmpty(groups.colors) ? this.renderNoOverlap() :
				this.renderPlot();

		const actions = [
			{
				children: [<i className='material-icons'>close</i>],
				className: kmStyle.mainDialogClose,
				onClick: this.hide
			}
		];
		return (
			<Dialog
				actions={actions}
				active={true}
				title={'Kaplan Meier ' + title}
				className={kmStyle.mainDialog}
				onEscKeyDown={this.hide}
				onOverlayClick={this.hide}
				theme={{
					wrapper: kmStyle.dialogWrapper,
					overlay: kmStyle.dialogOverlay}}>
				{Content}
			</Dialog>);
	}
}

export {KmPlot};
