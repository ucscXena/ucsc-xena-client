'use strict';
var _ = require('../underscore_ext');
const React = require('react');
const NameColumn = require('./NameColumn');
const Exons = require('./Exons');
const DensityPlot = require('./DensityPlot');
const GeneInput = require('./GeneInput');
// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	getInitialState() {
		return {
			gene: "TP53",
			studyA: "",
			subtypeA: "",
			studyB: "",
			subtypeB: ""
		};
	},

	onLoadData() {
		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', this.state.gene, this.state.studyA, this.state.subtypeA, this.state.studyB, this.state.subtypeB]);
		// this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
	},

	handleSelect: function() {
			this.setState({
				studyA: this.refs.A.value.substring(0, this.refs.A.value.indexOf('|')),
				subtypeA: this.refs.A.value.substring(this.refs.A.value.indexOf('|') + 1),
				studyB: this.refs.B.value.substring(0, this.refs.B.value.indexOf('|')),
				subtypeB: this.refs.B.value.substring(this.refs.A.value.indexOf('|') + 1)
			});
			this.onLoadData();
	},

	handleGeneSelect: function (gene) {
		this.setState({
			gene: gene
		});
	},

	render() {
		// var data = this.props.state.transcripts ? (
		// 	<pre style={{width: 500}}>
		// 		{JSON.stringify(this.props.state.transcripts, null, 4).slice(0, 1000)}
		// 	</pre>) : null;

		//for data selection
		var {subtypes} = this.props.state.transcripts || {};
		var options = [];
		subtypes.tcga.forEach( name => {
			options.push(<option value = {"tcga|" + name}>TCGA {name}</option>);
		});
		subtypes.gtex.forEach( name => {
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
					<GeneInput geneSelect={this.handleGeneSelect}/>
					<select ref="A">
						{options}
					</select>
					<select ref="B">
						{options}
					</select>
					<button onClick={this.handleSelect.bind(this)}>OK</button>
					<br/>
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
