'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
const Exons = require('./Exons');
const DensityPlot = require('./DensityPlot');
const GeneSuggest = require('../views/GeneSuggest');
// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			gene: this.props.state.gene || ""
		};
	},

	onLoadData(studyA, subtypeA, studyB, subtypeB) {
		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.state.gene !== "" ?
		this.props.callback(['loadGene', this.state.gene, studyA, subtypeA, studyB, subtypeB]) :
		null;
		// this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
	},

	handleSelect: function() {
			if(!this.state.gene)
			alert("Enter gene first");

			[this.studyA, this.subtypeA] = this.refs.A.value.split(/\|/);
			[this.studyB, this.subtypeB] = this.refs.B.value.split(/\|/);
			this.onLoadData(this.studyA, this.subtypeA, this.studyB, this.subtypeB);
	},

	handleGeneSelect: function () {
		this.onLoadData(this.studyA, this.subtypeA, this.studyB, this.subtypeB);
	},

	render() {
		//for data selection
		var {subtypes, studyA, subtypeA, studyB, subtypeB} = this.props.state.transcripts || {};
		if(!subtypes)
		{
			return <h4>"Loading available subtypes..."</h4>;
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
		var transcriptNameData = _.pluck(genetranscripts, 'name');

		//for the exon-intron visualization
		var transcriptExonData = _.map(genetranscripts, t => _.omit(t, ['name', 'chrom', 'expA', 'expB']));

		// for the density plot
		var transcriptDensityData = {
			expA: _.pluck(genetranscripts, "expA"),
			expB: _.pluck(genetranscripts, "expB")
		};

		return (
			<div ref='datapages'>
				<div>
					<GeneSuggest value={this.state.gene}
											onChange={ value => { this.setState({gene: value}); }}
										/>
					<button onClick={this.handleGeneSelect.bind(this)}>OK</button>
					click this after entering new value of gene
					<br/>
					<select ref="A" onChange={this.handleSelect} value={valueA}>
						{options}
					</select>
					<select ref="B" onChange={this.handleSelect} value={valueB}>
						{options}
					</select>
					<br/>
					<h5><strong>Gene: </strong>{this.state.gene} <strong>StudyA: </strong>{studyA} {subtypeA} <strong>StudyB: </strong>{studyB} {subtypeB}</h5>
					<NameColumn
						data={transcriptNameData}
						/>
					<Exons
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
