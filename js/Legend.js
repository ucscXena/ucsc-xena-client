/*global module: false, require: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
require('./Legend.css');

function rgb(color) {
	if (_.isArray(color)) {
		return color;
	}
	if (color.indexOf('rgb') === 0) {      // rgb[a]
		return _.map(color.replace(/^rgba?\(([^)]*)\)/, "$1").split(/ *, */).slice(0, 3),
					 n => parseInt(n, 10));
	} else if (color.indexOf('#') === 0) { // hex
		return [
			parseInt(color.substring(1, 3), 16),
			parseInt(color.substring(3, 5), 16),
			parseInt(color.substring(5, 7), 16)
		];
	}
	throw Error("Unknown color format " + color);
}

// http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
var luminance = ([R, G, B]) => 0.299 * R + 0.587 * G + 0.114 * B;
var contrastColor = color => luminance(rgb(color)) < 147 ? 'white' : 'black';


var nodata = [["No Data", "#808080"]];

// klass? upperBorderIndex?
var Legend = React.createClass({
	render: function () {
		var {label, labels, colors, align} = this.props,
			items = _.map(nodata.concat(_.zip(labels, colors)), ([l, c], i) =>
						  <label className='Legend-label'
							  key={i}
							  title={l}
							  style={{backgroundColor: c,
								  color: contrastColor(c),
								  textAlign: align}}>

							  {l}
						  </label>).reverse();
		return (
			<div>
				{label ?
					<Row>
						<Col md={12}>
							<label>{label}</label>
						</Col>
					</Row> : null}
				<Row>
					<Col md={10} mdOffset={1}>
						{items}
					</Col>
				</Row>
			</div>
		);
	}
});

module.exports = Legend;
