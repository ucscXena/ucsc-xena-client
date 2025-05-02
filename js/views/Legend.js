
import React from 'react';
import {Typography} from '@material-ui/core';
import * as _ from '../underscore_ext.js';

// Styles
import compStyles from "./Legend.module.css";

import classNames from 'classnames';

var nodata = {
	text: "null: no data",
	color: "#808080",
};

class Legend extends React.Component {
	static defaultProps = { max: 40 };

	render() {
		var {labels, colors, titles, max, labelheader, footnotes, addBreakend = 0,
				codes, addNullNotation = 0, inline, onClick} = this.props,
			style = classNames(onClick && compStyles.clickable,
				inline && compStyles.inline),
			ellipsis = labels.length > max,
			items = _.map(_.last(_.zip(labels, colors, titles, codes), max),
				([l, c, t, code], i) =>
					(<div key={i} data-code={code} title={t}
								className={compStyles.item}>
							<div className={compStyles.colorBox}
								style={{backgroundColor: c}}/>
							<Typography component='label' className={compStyles.label}
										variant='caption'>
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
				{items ? <div className={compStyles.column} onClick={onClick}>
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

export default Legend;
