'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var {Row, Col} = require("react-material-responsive-grid");
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
				{items ?
					<Row>
						<Col xs4={4} xs8={8} sm={12}>
							{items}
						</Col>
					</Row> : null}
				{ellipsis ?
					<Row>
						<Col sm={12} text-right>
							<label className='Legend-label'>
								...
							</label>
						</Col>
					</Row> : null}
				{footnotes ?
					<Row>
						<Col sm={12}>
						{footnotesItems}
						</Col>
					</Row> : null}
			</div>
		);
	}
});

module.exports = Legend;
