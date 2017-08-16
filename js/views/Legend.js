'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var colorHelper = require('../color_helper');

// Styles
var compStyles = require('./Legend.module.css');

var nodata = [["null (no data)", "#808080"]];

var Legend = React.createClass({
	getDefaultProps: () => ({ max: 40 }),
	render: function () {
		var {labels, colors, max, footnotes} = this.props,
			ellipsis = labels.length > max,
			items = _.map(nodata.concat(_.last(_.zip(labels, colors), max)), ([l, c], i) =>
						  <label className={compStyles.label}
							  key={i}
							  title={l}
							  style={{backgroundColor: c,
								  color: colorHelper.contrastColor(c)}}>
							  {l}
						  </label>).reverse(),
			footnotesItems = footnotes ? footnotes.map(text =>
				<div className={compStyles.footnotes}>
					{text}
				</div>) : null;
		return (
			<div className={compStyles.Legend}>
				{items ? <div className={compStyles.column}>{items}</div> : null}
				{ellipsis ? <div>...</div> : null}
				{footnotes ? footnotesItems : null}
			</div>
		);
	}
});

module.exports = Legend;
