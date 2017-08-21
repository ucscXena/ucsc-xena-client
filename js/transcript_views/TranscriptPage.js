'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
const DensityPlot = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');
var {linearTicks} = require('../scale');
import '../../css/transcript_css/transcriptPage.css';

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			gene: _.getIn(this.props.state, ['transcripts', 'gene'], ""),
			scaleZoom: false,
		};
	},

	onLoadData() {
		this.setState({
			scaleZoom: false
		});
		var [studyA, subtypeA] = this.refs.A.value.split(/\|/);
		var [studyB, subtypeB] = this.refs.B.value.split(/\|/);
		var unit = this.refs.unit.value;

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', this.state.gene, studyA, subtypeA, studyB, subtypeB, unit]);
		// this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
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
		if(!subtypes)
		{
			return <h4>Loading available subtypes...</h4>;
		}
		var subtypesTcga = _.sortBy(subtypes.tcga),
			subtypesGtex = _.sortBy(subtypes.gtex);
		var valueA = studyA && subtypeA ? `${studyA}|${subtypeA}` : `tcga|${subtypesTcga[0]}`;
		var valueB = studyB && subtypeB ? `${studyB}|${subtypeB}` : `gtex|${subtypesGtex[0]}`;
		var options = _.concat(
			subtypesTcga.map(name => <option value = {"tcga|" + name}>{name}</option>),
			subtypesGtex.map(name => <option value = {"gtex|" + name}>{name}</option>));

		var {genetranscripts} = this.props.state.transcripts || {};
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

		return (
			<div ref='datapages'>
				<div style={{margin: "0 auto", width: "1200px"}}>
					<div className="selectors">
					<strong>Gene: </strong>
					<GeneSuggest value={this.state.gene}
											onChange={ value => { this.setState({gene: value}); }}/>
					</div>
					<button className="selectors" onClick={this.onLoadData}>OK</button>
					click this after entering new value of gene
					<strong className="selectors">Unit: </strong>
					<select ref="unit" onChange={this.onLoadData} value={unit}>
						<option value="tpm">tpm</option>
						<option value="isoformPercentage">isoformPercentage</option>
					</select>
					<div className="legend-holder">
						Legends
						<div className="legend" style={{backgroundColor: "#008080"}}><label>Study A</label></div>
						<div className="legend" style={{backgroundColor: "steelblue"}}><label>Study B</label></div>
					</div>
					<br/>
					<strong className="selectors">StudyA: </strong>
					<select ref="A" onChange={this.onLoadData} value={valueA}>
						{options}
					</select>
					<strong className="selectors">StudyB: </strong>
					<select ref="B" onChange={this.onLoadData} value={valueB}>
						{options}
					</select>
					<br/>
					{
						genetranscripts ?
					<div>
							<div className={this.state.scaleZoom ? "densityplot--label-div--zoom" : "densityplot--label-div"} onClick={this.scaleZoom}>
							<label style={{fontSize: "0.85em"}}>expression</label>
							<div>
								{
									densityplotAxisLabel.map(label => {
										return (
											<div>
												<label className="densityplot--label-x" style={{left: `${(label - min) * (this.state.scaleZoom ? 200 : 125) / range}px`}}>{label}</label>
												<div className="densityplot--label-vertical-tick" style={{left: `${(label - min) * (this.state.scaleZoom ? 200 : 125) / range}px`}}/>
											</div>
										);
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
						getNameZoom={this.onZoom}
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
					{
						genetranscripts ?
						<div className="densityplot--label-div-y">
							<label className="densityplot--label-y">density</label>
						</div> : null
					}
				</div>
			</div>);
	}
});

module.exports = Transcripts;
