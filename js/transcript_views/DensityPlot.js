'use strict';
 var React = require('react');
 var _ = require('../underscore_ext');

 import '../../css/transcript_css/densityPlot.css';
 var sc = require('science');

const bin = 20; //number of bins
const plotWidth = 125;
const plotHeight = 35;
var binWidth;

var DensityPlot = React.createClass ({

 calculateHeight(exp, max) {
    var logMin = Math.log2(0.001);
    let pxWidth = (max - logMin) / plotWidth;
    var newExp = exp.filter(e => e > logMin);
    var percentNonZero = newExp.length / exp.length;

    var kdePoints = sc.stats.kde().sample(newExp)(_.range(logMin, max + pxWidth, pxWidth));
    let yHeights;
    var estimates = kdePoints.map(kdep => {
      return kdep[1];
     });

    yHeights = estimates.map(est => {
      return est * percentNonZero;
    });

    //polyline points here
    let polylinePoints = "";
    binWidth = plotWidth / yHeights.length;
    yHeights.forEach( (y, i) => {
      polylinePoints += (i * binWidth) + ',' + (1 - y) * plotHeight + ' ';
    });

    // _.range(0, Math.floor(1 / pxWidth)).forEach(
    //   () => yHeights.unshift(1 - percentNonZero)
    // );

    let zeroWidth = 1 / pxWidth;
    let zeroHeight = (1 - percentNonZero) * plotHeight;

    return {
      polylinePoints: polylinePoints,
      zeroWidth: zeroWidth,
      zeroHeight: zeroHeight
    };

    // return yHeights;
  },

  calculateFrequency(exp, max, min) {
     const stepSize = (max - min) / bin;
     let freq;
     (freq = []).length = bin;
     freq.fill(0);

     exp.forEach(value => {
       freq[Math.floor((value - min) / stepSize)]++;
     });
     freq.forEach(( value, index) => {
       value = value; //did this to remove error while committing "value is never used"
       freq[index] = freq[index] / exp.length;
     });
    return freq;
  },

 	render () {
 		let data = this.props.data ? this.props.data : null;
    let max = Math.max.apply(Math, _.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB"))));
    let min = Math.min.apply(Math, _.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB"))));
 		let rows = _.mmap(data.studyA, data.studyB, (studyA, studyB) => {
      if(this.props.type === 'density')
      {
        // let kdepoints;
        let polylinePoints, zeroWidth, zeroHeight;
        return (
          <div className="densityPlot--row">
            <div className="densityPlot--row--xAxis"/>
            <div className="densityPlot--row--studyA">
                 {
                   {polylinePoints, zeroWidth, zeroHeight} = this.calculateHeight(studyA.expA, max, min),
                   <svg width={plotWidth} height={plotHeight}>
                     <rect x="0" y={plotHeight - zeroHeight} width={zeroWidth} height={zeroHeight} fill="#008080"/>
                     <polyline points={polylinePoints} fill="#008080"/>
                   </svg>
                  //  kdepoints = this.calculateHeight(studyA.expA, max, min),
                  //  kdepoints.map(kde => {
                  //    return (
                  //      <div className="densityPlot--row--bin"
                  //           style={{height: (kde * 100) + "%",
                  //                   width: "1px",
                  //                   backgroundColor: "#008080"
                  //                 }}
                  //               />
                  //    );
                  //  })
                 }
            </div>
            <div className="densityPlot--row--studyB">
                 {
                   {polylinePoints, zeroWidth, zeroHeight} = this.calculateHeight(studyB.expB, max, min),
                   <svg width={plotWidth} height={plotHeight}>
                     <rect x="0" y={plotHeight - zeroHeight} width={zeroWidth} height={zeroHeight} fill="steelblue"/>
                     <polyline points={polylinePoints} fill="steelblue"/>
                   </svg>
                  //  kdepoints = this.calculateHeight(studyB.expB, max, min),
                  //  kdepoints.map(kde => {
                  //    return (
                  //      <div className="densityPlot--row--bin"
                  //           style={{height: (kde * 100) + "%",
                  //                   width: "1px",
                  //                   backgroundColor: "lightsteelblue"
                  //                 }}
                  //               />
                  //    );
                  //  })
                 }
            </div>
          </div>
        );
      }
      else if(this.props.type === 'histogram')
      {
        let frequency;
   			return (
          <div className="densityPlot--row">
   						<div className="densityPlot--row--xAxis"/>
              <div style={{display: "flex",
                           alignItems: "flex-end",
                           height: "50%",
                           width: "100%"}}>
              {
                  frequency = this.calculateFrequency(studyA.expA, max, min),
                  frequency.map( f => {
                    return (
                      <div className="densityPlot--row--bin"
                           style={{height: (f * 100) + "%",
                                   width: (1 / bin * 100) + "%",
                                   backgroundColor: "#008080",
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
                  frequency = this.calculateFrequency(studyB.expB, max, min),
                  frequency.map( f => {
                    return (
                      <div className="densityPlot--row--bin"
                           style={{height: (f * 100) + "%",
                                   width: (1 / bin * 100) + "%",
                                   backgroundColor: "steelblue"
                                   }}
                         />
                    );
                  })
              }
            </div>
   			 	</div>);
      }
 		});
 		return (
 			<div className="densityPlot"
 				 style={{height: (data.studyA.length * 70) + "px"}}>
 				{rows}
 			</div>
 			);
 	}
 });

 module.exports = DensityPlot;
