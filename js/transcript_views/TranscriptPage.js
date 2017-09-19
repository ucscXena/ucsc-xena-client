'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
var {DensityPlot, bottomColor, topColor, plotWidth} = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');
var {linearTicks} = require('../scale');
import '../../css/transcript_css/transcriptPage.css';

var defaultGene = 'KRAS';
	/*defaultStudyA = 'tcga',
	defaultStudyB = 'gtex',
	defaultSubtypeA  = 'TCGA Lung Adenocarcinoma',
	defaultSubtypeB  = 'GTEX Lung',
	defaultUnit = 'tpm';
	*/

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			gene: _.getIn(this.props.state, ['transcripts', 'gene'], defaultGene),
			input: _.getIn(this.props.state, ['transcripts', 'gene'], defaultGene),
			scaleZoom: false
		};
	},

	componentDidMount () {
	//	if (!this.props.state.transcripts) {
	//		this.props.callback(['loadGene', defaultGene, defaultStudyA, defaultSubtypeA, defaultStudyB, defaultSubtypeB, defaultUnit]);
	//	}
	},

	onLoadData() {
		this.setState({
			scaleZoom: false
		});
		var [studyA, subtypeA] = this.refs.A.value.split(/\|/);
		var [studyB, subtypeB] = this.refs.B.value.split(/\|/);
		var unit = this.refs.unit.value;
		var gene = this.state.input;

		this.setState({gene: gene});

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', gene, studyA, subtypeA, studyB, subtypeB, unit]);
	},

	onZoom(name) {
		this.props.callback(['zoom', name]);
	},

	scaleZoom() {
		this.setState({
			scaleZoom: !this.state.scaleZoom,
		});
	},

	render() {
		//for data selection
		var {subtypes, studyA, subtypeA, studyB, subtypeB, unit, zoom = {}} = this.props.state.transcripts || {};
		if (!subtypes)
		{
			return <h4>Loading available subtypes...</h4>;
		}
		var subtypesTcga = _.sortBy(subtypes.tcga),
			subtypesGtex = _.sortBy(subtypes.gtex),
			valueA = studyA && subtypeA ? `${studyA}|${subtypeA}` : `tcga|${subtypesTcga[0]}`,
			valueB = studyB && subtypeB ? `${studyB}|${subtypeB}` : `gtex|${subtypesGtex[0]}`,
			options = _.concat(
				subtypesTcga.map(name => <option value = {"tcga|" + name}>{name}</option>),
				subtypesGtex.map(name => <option value = {"gtex|" + name}>{name}</option>)),
			unitLabels = {
				tpm: {
					dropdown: "TPM",
					axis: "log2 (TPM)"
				},
				isoformPercentage: {
					dropdown: "Isoform Percentage",
					axis: "Isoform Percentage"
				}
			};

		var {genetranscripts} = this.props.state.transcripts || [];
		var genetranscriptsSorted = _.sortBy(genetranscripts, function(gtranscript) {
			return _.sum(_.mmap(gtranscript.exonStarts, gtranscript.exonEnds, (exonStarts, exonEnds) => {
				return exonStarts - exonEnds; // start - end to sort in descending order
			})); }).map(t => _.assoc(t, 'zoom', zoom[t.name]));
		//for the name column
		var transcriptNameData = _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'exonCount', 'zoom'));

		//for the exon-intron visualization
		var transcriptExonData = _.map(genetranscriptsSorted, t => _.omit(t, ['chrom', 'expA', 'expB']));

		// for the density plot
		var transcriptDensityData = {
			studyA: _.map(genetranscriptsSorted, t => _.pick(t, 'expA')),
			studyB: _.map(genetranscriptsSorted, t => _.pick(t, 'expB')),
			nameAndZoom: _.map(genetranscriptsSorted, t => _.pick(t, 'name', 'zoom')),
		};

		//calculation of max and min same as in DensityPlot.js and passing max, min as parameters to linearTicks
		var max = Math.max.apply(Math, _.flatten(_.pluck(transcriptDensityData.studyA, "expA").concat(_.pluck(transcriptDensityData.studyB, "expB"))));
		var min = Math.min.apply(Math, _.flatten(_.pluck(transcriptDensityData.studyA, "expA").concat(_.pluck(transcriptDensityData.studyB, "expB"))));
		var densityplotAxisLabel = isFinite(max) && isFinite(min) ? linearTicks(min, max) : [];
		var range = max - min;
		var hasPlots = genetranscripts && ! _.isEmpty(genetranscripts);

		return (
				<div style={{margin: "20px auto", width: "1200px"}}>
					<a className="selectors" style={{fontSize: "0.85em"}} href="http://xena.ucsc.edu/transcript-view-help/">Help with transcripts</a>
					<div className="selectors" style={{width: "1200px", height: "80px"}}>
						<div id="geneBox" style={{float: "left", width: "200px"}}>
							<GeneSuggest label="Gene (e.g. KRAS)" value={this.state.input}
								onChange={ value => {this.setState({input: value});} }/>
						</div>
						{this.state.input ?
							<button className="horizontalSegmentButton" onClick={this.onLoadData}>Update Gene</button> :
							<button className="horizontalSegmentButton" onClick={this.onLoadData}>Add Gene</button>
						}
						{ hasPlots ?
							<div className="legend-holder">
								<div style={{display: "inline-block"}}>
									<div className="legend" style={{backgroundColor: topColor}}><label>{subtypeA}</label></div>
									<div className="legend" style={{backgroundColor: bottomColor}}><label>{subtypeB}</label></div>
								</div>
							</div> : null
						}
					</div>
					<div style={{width: "1200px"}}>
						<div style={{"margin-bottom": "10px"}}>
							<span className="selectors">Study A</span>
							<select ref="A" onChange={this.onLoadData} value={valueA}>
								{options}
							</select>
							<span className="selectors">Study B</span>
							<select ref="B" onChange={this.onLoadData} value={valueB}>
								{options}
							</select>
						</div>
						<div>
							<span className="selectors">Expression Unit</span>
							<select ref="unit" onChange={this.onLoadData} value={unit}>
								<option value="tpm">{unitLabels.tpm.dropdown}</option>
								<option value="isoformPercentage">{unitLabels.isoformPercentage.dropdown}</option>
							</select>
						</div>
					</div>

					{ hasPlots ?
						<div>
							<div className="densityplot--label-div-zero">
								<label className="densityplot--label-zero">no expression</label>
							</div>
							<div className="densityplot--label-div--zoom" onClick={this.scaleZoom}>
								<label style={{fontSize: "0.85em", width: plotWidth}}>{unitLabels[unit].axis}</label>
								<div>
									{ densityplotAxisLabel.map((label, i) => {
										return (
											<div>
												<label className="densityplot--label-x" style={{left: `${(label - min) * plotWidth / range}px`}}>{label}{(unit === "isoformPercentage" && i === densityplotAxisLabel.length - 1) ? "%" : "" }</label>
												<div className="densityplot--label-vertical-tick" style={{left: `${(label - min) * plotWidth / range}px`}}/>
											</div>);
										})
									}
								</div>
								<div className="densityplot--label--axis-x"/>
							</div>
							<div style={{width: "100%", height: "35px"}}></div>
						</div> : null
					}
					<NameColumn
						data={transcriptNameData}
						gene={this.state.gene}
						/>
					{/* <Exons
						data={transcriptExonData}
					/> */}
					<ExonsOnly
						data={transcriptExonData}
						getNameZoom={this.onZoom}
					/>
					<DensityPlot
						data={transcriptDensityData}
						type="density"
						unit={unit}
						getNameZoom={this.onZoom}
						/>
					{/* <DensityPlot
						data={transcriptDensityData}
						type="histogram"
						unit={unit}
						getNameZoom={this.onZoom}
						/> */}
					{ (genetranscripts && ! _.isEmpty(genetranscripts)) ?
						<label className="densityplot--label-y">density</label> : null
					}
				</div>
		);
	}
});

module.exports = Transcripts;
