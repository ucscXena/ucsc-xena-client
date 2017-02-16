'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var colorHelper = require('../color_helper');
require('./Legend.css');

var nodata = [["null (no data)", "#808080"]];

var Legend = React.createClass({
	getDefaultProps: () => ({ max: 40 }),
	render: function () {
		var {labels, colors, max, footnotes} = this.props,
			ellipsis = labels.length > max,
			items = _.map(nodata.concat(_.last(_.zip(labels, colors), max)), ([l, c], i) =>
						  <label className='Legend-label'
							  key={i}
							  title={l}
							  style={{backgroundColor: c,
								  color: colorHelper.contrastColor(c),
								  textAlign: 'center'}}>

							  {l}
						  </label>).reverse(),
			footnotesItems = footnotes ? footnotes.map(text =>
				<span>
					{text}
					<br/>
				</span>) : null;
		return (
			<div>
				<Row>
					<Col md={10} mdOffset={1}>
						{items}
					</Col>
				</Row>
				{ellipsis ?
					<Row>
						<Col md={10} mdOffset={1}>
							More values ...
						</Col>
					</Row> : null}
				<br/>
				{footnotes ?
					<Row>
						<Col md={10} mdOffset={1}>
						{footnotesItems}
						</Col>
					</Row> : null}
			</div>
		);
	}
});

module.exports = Legend;
