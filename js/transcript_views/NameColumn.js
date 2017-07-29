'use strict';
var React = require('react');
var colorScales = require('../colorScales');
var {contrastColor} = require('../color_helper');
import '../../css/transcript_css/nameColumn.css';
var {deepPureRenderMixin} = require('../react-utils');

const rowHeight = 70;

var NameColumn = React.createClass({
	mixins: [deepPureRenderMixin],

	render() {
		let data = this.props.data || {};
		let colors = colorScales.colorScale(['ordinal', data.length]);
		let items = data.map((d, index) => {
			let rowClass = d.zoom ? "nameColumn--item--zoom" : "nameColumn--item";
			return (
				<div className={rowClass}
				 style={{	backgroundColor: colors(index),
									color: contrastColor(colors(index)),
				 		}}
				 onClick={() => this.props.getNameZoom(d.name)}>
				 	<span><i>{d.name}</i></span>
				</div>);
		});

		//height of each row has been set to 70px
		return(
				<div className="nameColumn"
					 style={{height: (data.length * rowHeight) + "px"}}>
					{items}
				</div>

			);
	}
});

module.exports = NameColumn;
