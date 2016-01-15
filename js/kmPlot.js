/*eslint-env browser */
/*global require: false, module: false */

'use strict';

require('../css/km.css');
var _ = require('./underscore_ext');
var warningImg = require('../images/warning.png');
var React = require('react');
var Modal = require('react-bootstrap/lib/Modal');
var Axis = require('./Axis');
var {deepPureRenderMixin} = require('./react-utils');
var {linear, linearTicks} = require('./scale');
// XXX Warn on duplicate patients, and list patient ids?

// Basic sizes. Should make these responsive. How to make the svg responsive?
var size = {width: 960, height: 450};
var margin = {top: 20, right: 200, bottom: 30, left: 50};

// XXX point at 100%? [xdomain[0] - 1, 1]
function line(xScale, yScale, values) {
	var coords = values.map(({t, s}) => [xScale(t), yScale(s)]);
	return ['M0,0', ...coords.map(([t, s]) => `H${t}V${s}`)].join(' ');
}

function censorLines(xScale, yScale, censors, className) {
	/*eslint-disable comma-spacing */
	return censors.map(({t, s}, i) =>
			<line key={i} className={className} x1={0} x2={0} y1={-5} y2={5}
				transform={`translate(${xScale(t)},${yScale(s)})`}/>);
	/*eslint-enable comma-spacing */
}

function drawGroup(xScale, yScale, [color, label, curve]) {
	var censors = curve.filter(pt => !pt.e);
	return (
		<g key={label} className='subgroup' stroke={color}>
			<path className='outline' d={line(xScale, yScale, curve)}/>
			<path className='line' d={line(xScale, yScale, curve)}/>
			{censorLines(xScale, yScale, censors, 'outline')}
			{censorLines(xScale, yScale, censors, 'line')}
		</g>);
}

var bounds = x => [_.min(x), _.max(x)];

function svg({colors, labels, curves}) {
	var height = size.height - margin.top - margin.bottom,
		width = size.width - margin.left - margin.right,
		xdomain = bounds(_.pluck(_.flatten(curves), 't')),
		xrange = [0, width],
		ydomain = [0, 1],
		yrange = [height, 0],
		xScale = linear(xdomain, xrange),
		yScale = linear(ydomain, yrange);

	var groupSvg = _.zip(colors, labels, curves).map(g => drawGroup(xScale, yScale, g));

	/*eslint-disable comma-spacing */
	return (
		<svg className='kmplot' width={size.width} height={size.height}>
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

var KmPlot = React.createClass({
	mixins: [deepPureRenderMixin],
	getDefaultProps: () => ({
		eventClose: 'km-close'
	}),
	hide: function () {
		let {callback, eventClose} = this.props;
		callback([eventClose]);
	},
	render: function () {
		let {km: {label, groups}} = this.props;
		// XXX Use bootstrap to lay this out, instead of tables + divs
		return (
			<Modal bsSize='large' className='kmDialog' onRequestHide={this.hide} title={`Kaplan-Meier: ${label}`}>
					<div className='kmdiv'>
						<div>
							{groups ? svg(groups) : "Loading..."}
							<div className='kmScreen'/>
						</div>
						<div className='kmopts'>
							<div>
								<table className='kmOpts'>
									<tr>
										<td className='tupleLabel'> Event Column: </td>
										<td className='tupleValue'>
											<select className='eventfeature'/>
										</td>
									</tr>
									<tr>
										<td className='tupleLabel'> Time Column: </td>
										<td className='tupleValue'>
											<select className='timefeature'/>
										</td>
									</tr>
								</table>
							</div>
						</div>
					</div>
					<div>
						<span className='featureLabel'/>
						<span className='warningIcon'>
							<img src={warningImg} alt=''/>
						</span>
					</div>
			</Modal>
		);
	}
});

module.exports = KmPlot;
