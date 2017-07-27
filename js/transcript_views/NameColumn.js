'use strict';
var React = require('react');
var colorScales = require('../colorScales');
var {contrastColor} = require('../color_helper');
import '../../css/transcript_css/nameColumn.css';
var {deepPureRenderMixin} = require('../react-utils');

var NameColumn = React.createClass({
	mixins: [deepPureRenderMixin],
	render() {
		let data = this.props.data || {};
		let colors = colorScales.colorScale(['ordinal', data.length]);
		let items = data.map((d, index) => {
			return (
				<div className="nameColumn--item"
				 style={{	backgroundColor: colors(index),
									color: contrastColor(colors(index)),
				 		}}>
				 	<span><i>{d.name}</i></span>
				</div>);
		});

		//height of each row has been set to 70px
		return(
				<div className="nameColumn"
					 style={{height: (data.length * 70) + "px"}}>
					{items}
				</div>

			);
	}
});

module.exports = NameColumn;
