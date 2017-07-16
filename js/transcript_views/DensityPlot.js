'use strict';
 var React = require('react');
 var _ = require('../underscore_ext');

 import '../../css/transcript_css/densityPlot.css';
 var sc = require('science');

const bin = 20; //number of bins
const width = 125;

var DensityPlot = React.createClass ({

  calculateHeight(exp, max, min) {
    let pxWidth = (max - min) / width;
    var kdePoints = sc.stats.kde().sample(exp)(_.range(min, max + pxWidth, pxWidth));
    let yHeights;
    var estimates = kdePoints.map(kdep => {
      return kdep[1];
    });
    let maxEst = Math.max.apply(Math, estimates);
    yHeights = estimates.map(est => {
      return est / maxEst;
    });
    return yHeights;
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
        let kdepoints;
        return (
          <div className="densityPlot--row">
            <div className="densityPlot--row--xAxis"/>
            <div className="densityPlot--row--studyA">
                 {
                   kdepoints = this.calculateHeight(studyA.expA, max, min),
                   kdepoints.map(kde => {
                     return (
                       <div className="densityPlot--row--bin"
                            style={{height: (kde * 100) + "%",
                                    width: "1px",
                                    backgroundColor: "#008080"
                                  }}
                                />
                     );
                   })
                 }
            </div>
            <div className="densityPlot--row--studyB">
                 {
                   kdepoints = this.calculateHeight(studyB.expB, max, min),
                   kdepoints.map(kde => {
                     return (
                       <div className="densityPlot--row--bin"
                            style={{height: (kde * 100) + "%",
                                    width: "1px",
                                    backgroundColor: "lightsteelblue"
                                  }}
                                />
                     );
                   })
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
