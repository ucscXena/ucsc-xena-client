'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
const DensityPlot = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');

import '../../css/transcript_css/transcriptPage.css';

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		let genetranscripts = _.getIn(this.props.state, ['transcripts', 'genetranscripts'], []);
		genetranscripts.forEach(t => {
			t.zoom = false;
		});
		return {
			gene: _.getIn(this.props.state, ['transcripts', 'gene'], ""),
			genetranscripts: genetranscripts,
		};
	},

	onLoadData() {
		var [studyA, subtypeA] = this.refs.A.value.split(/\|/);
		var [studyB, subtypeB] = this.refs.B.value.split(/\|/);
		var unit = this.refs.unit.value;

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', this.state.gene, studyA, subtypeA, studyB, subtypeB, unit]);
		// this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
	},

	onZoom(name) {
		let newState = _.updateIn(this.props.state, ['transcripts', 'genetranscripts'], g => {
			[...g].forEach((t, index) => {
				if(_.isMatch(t, {name: name}))
				{
					g[index] = _.assoc(t, "zoom", !t.zoom);
				}
			});
			return g;
		});
		let genetranscript = _.getIn(newState, ['transcripts', 'genetranscripts'], []);
		this.setState({
			genetranscript: genetranscript,
		});
	},

	render() {
		//for data selection
		var {subtypes, studyA, subtypeA, studyB, subtypeB, unit} = this.props.state.transcripts || {};
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
			})); });
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

		return (
			<div ref='datapages'>
				<div>
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
					<DensityPlot
						data={transcriptDensityData}
						type="histogram"
						unit={unit}
						getNameZoom={this.onZoom}
						/>
				</div>
			</div>);
	}
});

module.exports = Transcripts;
