'use strict';

var React = require('react');

var tickPadding = 3;
function horzLayout(domain, range, scale, tickfn, tickHeight) {
	return tickfn.apply(null, domain).map(x => ([
		[scale(x), 0], [0, tickHeight],
		[0, tickHeight + tickPadding], x.toLocaleString(),
		'middle', '.71em'
	]));
}

function vertLayout(domain, range, scale, tickfn, tickHeight) {
	return tickfn.apply(null, domain).map(y => ([
		[0, scale(y)], [-tickHeight, 0],
		[-(tickHeight + tickPadding), 0], y.toLocaleString(),
		'end', '.32em'
	]));
}

var layout = {
	bottom: horzLayout,
	left: vertLayout
};

var domainPath = {
	bottom: ([start, end], height) => `M${start},${height}V0H${end}V${height}`,
	left: ([start, end], height) => `M${-height},${start}H0V${end}H${-height}`
};

class Axis extends React.Component {
	render() {
		var {domain, range, scale, tickfn, orientation, groupProps = {},
			tickHeight = 6} = this.props;
		var ticks = layout[orientation](domain, range, scale, tickfn, tickHeight);
		return (
			<g {...groupProps}>
			<path className='domain' d={domainPath[orientation](range, tickHeight)} />
			 {ticks.map(([[x, y], [dx, dy], [lx, ly], label, anchor, off], i) => (
					<g key={i} transform={`translate(${x}, ${y})`}>
						<line x2={dx} y2={dy}/>
						<text dy={off} y={ly} x={lx} style={{textAnchor: anchor}}>{label}</text>
					</g>
			 ))}
			 {this.props.children}
			</g>
		);
	}
}

module.exports = Axis;
