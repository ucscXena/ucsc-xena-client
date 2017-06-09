'use strict';
 var React = require('react');
 var _ = require('../underscore_ext');

 import '../../css/transcript_css/densityPlot.css';



 var DensityPlot = React.createClass ({


 	//not sure how to calclate the desity plot, so have just rendered the x-axes
 	// calcHeight(exp, range) {

 	// },

 	render () {
 		let data = this.props.data ? this.props.data : null;
 		let rows = _.mmap(data.expA, data.expB, (expA, expB) => {
 			return (<div className="densityPlot--row">
 						{	//did this to avoid error of strict mode
 							console.log(expB)
 						}
 						<div className="densityPlot--row--xAxis"/>
 			 			</div>);
 		});
 		return (
 			<div className="densityPlot"
 				 style={{height: (data.expA.length * 70) + "px"}}>
 				{rows}
 			</div>
 			);
 	}
 });

 module.exports = DensityPlot;
