'use strict';
var React = require('react');
var colorScales = require('../colorScales');
var {contrastColor} = require('../color_helper');
import '../../css/transcript_css/nameColumn.css';
var styles = require('./NameColumn.module.css');

class NameColumn extends React.PureComponent {
	render() {
		let data = this.props.data || {},
			gene = this.props.gene;
		let colors = colorScales.colorScale(['ordinal', data.length]);
		let items = data.map((d, index) => {
			let rowClass = d.zoom ? "nameColumn--item--zoom" : "nameColumn--item";
			return (
				<div className={styles[rowClass]} style={{backgroundColor: colors(index), color: contrastColor(colors(index))}}>
					<span><i>{gene} {d.name}</i></span>
				</div>);
		});

		//height of each row has been set to 70px
		return(
				<div className={styles.nameColumn}>
					{items}
				</div>

			);
	}
}

module.exports = NameColumn;
