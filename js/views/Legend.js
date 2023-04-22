
var React = require('react');
import {Typography} from '@material-ui/core';
var _ = require('../underscore_ext').default;

// Styles
var compStyles = require('./Legend.module.css');
var classNames = require('classnames');

var nodata = {
	text: "null: no data",
	color: "#808080",
};

class Legend extends React.Component {
	static defaultProps = { max: 40 };

	render() {
		var {labels, colors, titles, max, labelheader, footnotes, addBreakend = 0,
				addNullNotation = 0, inline, clickable} = this.props,
			style = classNames(clickable && compStyles.clickable,
				inline && compStyles.inline),
			ellipsis = labels.length > max,
			items = _.map(_.last(_.zip(labels, colors, titles), max), ([l, c, t], i) =>
				(<div key={i} data-i={Math.max(labels.length - max, 0) + i} title={t}
							className={compStyles.item}>
						<div className={compStyles.colorBox}
							style={{backgroundColor: c}}/>
						<Typography component='label' className={compStyles.label} variant='caption'>
							{l}
						</Typography>
					</div>)).reverse(),
			footnotesItems = footnotes ? footnotes.map((text, i) =>
								<Typography key={i} component='div' className={compStyles.footnotes} variant='caption'>
									{text}
								</Typography>) :
								null,
			breakend = (
				<div className={compStyles.item}>
					<div className={compStyles.breakendBar}/>
					<Typography component='label' className={compStyles.label} variant='caption'>breakend</Typography>
				</div>
				),
			nullNotation = (
				<div title={nodata.text}>
					<Typography component='label' className={compStyles.null} style={{backgroundColor: nodata.color}} variant='caption'>
						{nodata.text}
					</Typography>
				</div>);

		return (
			<div className={style}>
				{items ? <div className={compStyles.column}>
							{labelheader ? <label className={compStyles.header}>{labelheader}</label> : null}
							{items}
							{addBreakend ? breakend : null}
							{addNullNotation ? nullNotation : null}
						</div> :
					null}
				{ellipsis ? <div>...</div> : null}
				{footnotes ? footnotesItems : null}
			</div>
		);
	}
}

module.exports = Legend;
