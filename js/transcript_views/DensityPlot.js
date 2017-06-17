'use strict';
 var React = require('react');
 var _ = require('../underscore_ext');

 import '../../css/transcript_css/densityPlot.css';



 var DensityPlot = React.createClass ({


 // 	not sure how to calclate the desity plot, so have just rendered the x-axes
 // 	calcHeight(exp, range) {
  //
 // 	},

  calculateFrequency(exp, max, min) {
     const stepSize = (max - min) / 100;       //here
     let freq;
    //  console.log("min", min);
    //  console.log("max", max);
     (freq = []).length = 100;                 //here
     freq.fill(0);
    //  console.log("freqzero", freq);
     for (let i = 1; i <= 100; i++ )           //here
     {
       exp.map(value => {
         if(min + stepSize * (i - 1) <= value && value <= min + stepSize * i)
         {
           freq[i - 1]++;
          //  console.log("entered", i);
         }
       })
     }
    //  for (let i = 0; i < exp.length; i++)
    //  {
    //    freq[i] = freq[i] / exp.length;
    //  }
     return freq;
  },

 	render () {
 		let data = this.props.data ? this.props.data : null;
    // let domain = Math.max(Math.max.apply(Math, data.expA), Math.max.apply(Math, data.expB)) - Math.min(Math.min.apply(Math, data.expA), Math.min.apply(Math, data.expB));
    // const stepSize = domain/100;


 		let rows = _.mmap(data.expA, data.expB, (expA, expB) => {
      let frequency;
      let max = Math.max(Math.max.apply(Math, expA), Math.max.apply(Math, expB));
      let min = Math.min(Math.min.apply(Math, expA), Math.min.apply(Math, expB));
 			return (
        <div className="densityPlot--row">
 						<div className="densityPlot--row--xAxis"/>
            <div style={{display: "flex",
                         alignItems: "flex-end",
                         height: "50%",
                         width: "100%"}}>
            {

                frequency = this.calculateFrequency(expA, max, min),
                // console.log("freq", frequency)
                frequency.map( f => {
                  return (
                    <div className="densityPlot--row--bin"
                         style={{height: ((f / Math.max.apply(Math, frequency)) * 100) + "%",
                                 width: (1 / 100 * 100) + "%",    //here
                                 backgroundColor: "cyan",
                                 }}
                       />
                  );
                })
              }
            </div>
            <div style={{display: "flex",
                         alignItems: "flex-end",
                         height: "50%",
                         width: "100%",
                         bottom: "50%",
                         webkitTransform: "rotateX(180deg)",
                         mozTransform: "rotateX(180deg)",
                         transform: "rotateX(180deg)"}}>
              {
                frequency = this.calculateFrequency(expB, max, min),
                // console.log("freq", frequency)
                frequency.map( f => {
                  return (
                    <div className="densityPlot--row--bin"
                         style={{height: ((f / Math.max.apply(Math, frequency)) * 100) + "%",
                                 width: (1 / 100 * 100) + "%",    //here
                                 backgroundColor: "steelblue"
                                 }}
                       />
                  );
                })
            }
          </div>
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
