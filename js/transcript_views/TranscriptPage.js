'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
// const {Exons} = require('./Exons');
const ExonsOnly = require('./ExonsOnly');
const DensityPlot = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			gene: _.getIn(this.props.state, ['transcripts', 'gene'], "")
		};
	},

	onLoadData() {
		var [studyA, subtypeA] = this.refs.A.value.split(/\|/);
		var [studyB, subtypeB] = this.refs.B.value.split(/\|/);

		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.state.gene !== "" ?
		this.props.callback(['loadGene', this.state.gene, studyA, subtypeA, studyB, subtypeB]) :
		null;
		// this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
	},

	render() {
		//for data selection
		var {subtypes, studyA, subtypeA, studyB, subtypeB} = this.props.state.transcripts || {};
		if(!subtypes)
		{
			return <h4>Loading available subtypes...</h4>;
		}
		var valueA = studyA && subtypeA ? `${studyA}|${subtypeA}` : `tcga|${subtypes.tcga[0]}`;
		var valueB = studyB && subtypeB ? `${studyB}|${subtypeB}` : `gtex|${subtypes.gtex[0]}`;
		var options = [];
		subtypes.tcga.sort().forEach( name => {
			options.push(<option value = {"tcga|" + name}>TCGA {name}</option>);
		});
		subtypes.gtex.sort().forEach( name => {
			options.push(<option value = {"gtex|" + name}>GTEx {name}</option>);
		});

		var {genetranscripts} = this.props.state.transcripts || {};

		//for the name column
		var transcriptNameData = _.map(genetranscripts, t => _.pick(t, 'name', 'exonCount'));

		//for the exon-intron visualization
		var transcriptExonData = _.map(genetranscripts, t => _.omit(t, ['name', 'chrom', 'expA', 'expB']));

		// for the density plot
		var transcriptDensityData = {
			studyA: _.map(genetranscripts, t => _.pick(t, 'expA', 'exonCount')),
			studyB: _.map(genetranscripts, t => _.pick(t, 'expB', 'exonCount'))
		};

		return (
			<div ref='datapages'>
				<div>
					<strong>Gene: </strong>
					<GeneSuggest value={this.state.gene}
											onChange={ value => { this.setState({gene: value}); }}
										/>
					<button onClick={this.onLoadData}>OK</button>
					click this after entering new value of gene
					<br/>
					<strong>StudyA: </strong>
					<select ref="A" onChange={this.onLoadData} value={valueA}>
						{options}
					</select>
					<strong>StudyB: </strong>
					<select ref="B" onChange={this.onLoadData} value={valueB}>
						{options}
					</select>
					<br/>
					<NameColumn
						data={transcriptNameData}
						/>
					{/* <Exons
						data={transcriptExonData}
					/> */}
					<ExonsOnly
						data={transcriptExonData}
					/>
					<DensityPlot
						data={transcriptDensityData}
						/>
				</div>
			</div>);
	}
});

module.exports = Transcripts;
