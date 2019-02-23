'use strict';

var React = require('react');
var _ = require('../underscore_ext');

// Styles
var compStyles = require('./Legend.module.css');

var nodata = {
	text: "null: no data",
	color: "#808080",
};

class Legend extends React.Component {
	static defaultProps = { max: 40 };

	render() {
		var {labels, colors, titles, max, header, footnotes, addNullNotation = 0} = this.props,
			ellipsis = labels.length > max,
			items = _.map(_.last(_.zip(labels, colors, titles), max), ([l, c, t], i) => {
				return (
					<div key={i} title={t}>
						<div className={compStyles.colorBox}
							style={{backgroundColor: c}}/>
						<label className={compStyles.label}>
							{l}
						</label>
					</div>);}).reverse(),
			footnotesItems = footnotes ? footnotes.map((text, i) =>
				<div key={i} className={compStyles.footnotes}>
					{text}
				</div>) : null,
			nullNotation = (
				<div title={nodata.text}>
					<label className={compStyles.null} style={{backgroundColor: nodata.color}}>
						{nodata.text}
					</label>
				</div>);

		return (
			<div className={compStyles.Legend}>
				{header ? <label className={compStyles.header}>{header}</label> : null}
				{items ? <div className={compStyles.column}>{items}</div> : null}
				{addNullNotation ? nullNotation : null}
				{ellipsis ? <div>...</div> : null}
				{footnotes ? footnotesItems : null}
			</div>
		);
	}
}

module.exports = Legend;
