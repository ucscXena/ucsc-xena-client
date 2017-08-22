   'use strict';
 var React = require('react');
 var _ = require('../underscore_ext');

 import '../../css/transcript_css/densityPlot.css';
 var sc = require('science');
 var {deepPureRenderMixin} = require('../react-utils');

const bin = 20; //number of bins
const plotHeight = 35;
const zoomFactor = 3;

function calculateHeight(exp, max, min, plotHt, plotWidth, unit) {
   let minValue = unit === "tpm" ? Math.log2(0.001) : min;
   let pxWidth = (max - minValue) / plotWidth;
  //  console.log(exp);
  // exp.forEach(e => e === NaN ? console.log(e) : null);
   let newExp = exp.filter(e => e > minValue);
   let percentNonZero = newExp.length / exp.length;
   let kdePoints = newExp.length ? sc.stats.kde().sample(newExp)(_.range(minValue, max + pxWidth, pxWidth)) : [];
   let yHeights = kdePoints.map(kdep => kdep[1] * percentNonZero);
   yHeights.forEach(y => y === 'NaN' ? console.log(y) : null);
   let binWidth = plotWidth / yHeights.length;
   let zPxWidth = 5; // draw zero at 5 px width
   let zeroWidth = pxWidth * zPxWidth;
   let zeroHeight = (1 - percentNonZero) / zeroWidth;
   let vscale = Math.max(zeroHeight, ...yHeights);
   //polyline points here
   let polylinePoints = [`0,${plotHt}`, ...yHeights.map((y, i) => `${i * binWidth},${(1 - y / vscale) * plotHt}`), `${plotWidth},${plotHt}`].join(' ');

//   For debugging the scaling. The 'sum' should be 1: area under the curve
//   of a density plot should always be 1. We take the values from kde and scale
//   them by percentNonZero, then compute zeroHeight to perserve the correct area.
//
//   We then scale the y axis by the max y value, to ensure that the data is
//   not clipped (for a sharp spike), or drawn too small to see (for a uniform
//   distribution).
//
//   pxSum and zPxSum compute the pixel area for zero and non-zero points. They
//   should have the same ratio as zeroSum and nonZeroSum if we've scaled correctly.
//
//   var zeroSum = zeroWidth * zeroHeight;
//   var nonZeroSum = _.sum(kdePoints.map(([, y]) => y * pxWidth)) * percentNonZero;
//   var pxSum = _.sum(yHeights.map(y => y * plotHt * binWidth));
//   var zPxSum = zPxWidth * zeroHeight * plotHt;
//   console.log('sum', nonZeroSum + zeroSum, JSON.stringify({nonZeroSum, zeroSum}));
//   console.log(JSON.stringify({nz: pxSum / (pxSum + zPxSum), z: zPxSum / (pxSum + zPxSum)}));
   return {
     polylinePoints: polylinePoints,
     zeroWidth: zPxWidth,
     zeroHeight: zeroHeight / vscale * plotHt
   };
 }

 function calculateFrequency(exp, max, min) {
     const stepSize = (max - min) / bin;
     let freq = _.times(bin, _.constant(0));

     exp.forEach(value => {
       freq[Math.floor((value - min) / stepSize)]++;
     });
     freq.forEach(( value, index) => {
       value = value; //did this to remove error while committing "value is never used"
       freq[index] = freq[index] / exp.length;
     });
    return freq;
  }

var DensityPlot = React.createClass ({
 mixins: [deepPureRenderMixin],
 	render () {
    let plotWidth = 125;
 		let data = this.props.data ? this.props.data : null;
    let max = Math.max.apply(Math, _.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB"))));
    let min = Math.min.apply(Math, _.flatten(_.pluck(data.studyA, "expA").concat(_.pluck(data.studyB, "expB"))));
 		let rows = _.mmap(data.studyA, data.studyB, data.nameAndZoom, (studyA, studyB, nameAndZoom) => {
      let rowClass = nameAndZoom.zoom ? "densityPlot--row--zoom" : "densityPlot--row";
      plotWidth = nameAndZoom.zoom ? 200 : 125;
      if(this.props.type === 'density')
      {
        let polylinePoints, zeroWidth, zeroHeight;
        let plotHt = nameAndZoom.zoom ? plotHeight * zoomFactor : plotHeight;
        return (
          <div className={rowClass} onClick={() => this.props.getNameZoom(nameAndZoom.name)}>
            <div className="densityPlot--row--xAxis"/>
            <div className="densityPlot--row--studyA">
                 {
                   {polylinePoints, zeroWidth, zeroHeight} = calculateHeight(studyA.expA, max, min, plotHt, plotWidth, this.props.unit),
                   <svg width={plotWidth} height={plotHt}>
                     <rect x="0" y={plotHt - zeroHeight} width={zeroWidth} height={zeroHeight} fill="#008080"/>
                     <polyline points={polylinePoints} fill="#008080"/>
                   </svg>
                 }
            </div>
            <div className="densityPlot--row--studyB">
                 {
                   {polylinePoints, zeroWidth, zeroHeight} = calculateHeight(studyB.expB, max, min, plotHt, plotWidth, this.props.unit),
                   <svg width={plotWidth} height={plotHt}>
                     <rect x="0" y={plotHt - zeroHeight} width={zeroWidth} height={zeroHeight} fill="steelblue"/>
                     <polyline points={polylinePoints} fill="steelblue"/>
                   </svg>
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
              <div className="densityPlot--row--studyA">
              {
                  frequency = calculateFrequency(studyA.expA, max, min),
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
              <div className="densityPlot--row--studyB">
                {
                  frequency = calculateFrequency(studyB.expB, max, min),
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
 				 style={{height: (data.studyA.length * plotHeight * 2) + "px"}}>
 				{rows}
 			</div>
 			);
 	}
 });

 module.exports = DensityPlot;
