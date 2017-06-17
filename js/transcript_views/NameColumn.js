'use strict';
var React = require('react');
var colorScales = require('../colorScales');
var {contrastColor} = require('../color_helper');
import '../../css/transcript_css/nameColumn.css';

var NameColumn = React.createClass({

	render() {

		let data = this.props.data ? this.props.data : [];
		let colors = colorScales.colorScale(['ordinal', data.length]);

		let items = data.map((name, index) => {
			return (
				<div className="nameColumn--item"
				 style={{ height: (100 / data.length) + "%",
				 		  		backgroundColor: colors(index),
									color: contrastColor(colors(index)),
				 		}}>
				 	<span>{name}</span>
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
