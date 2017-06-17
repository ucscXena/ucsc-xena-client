'use strict';

require('./base');

var _ = require('./underscore_ext');
// import controller for the transcript view actions
var controller = require('./controllers/transcripts');
const React = require('react');
const connector = require('./connector');
const createStore = require('./store');

const NameColumn = require('./transcript_views/NameColumn');
const Exons = require('./transcript_views/Exons');
const DensityPlot = require('./transcript_views/DensityPlot');

// Placeholder component. I'm expecting the real top-level view
// will be in a separate file, and imported above.
var Transcripts = React.createClass({
	onLoadData() {
		// Invoke action 'loadGene', which will load transcripts and
		// expression data.
		this.props.callback(['loadGene', 'TP53', 'tcga', 'Lung Adenocarcinoma', 'gtex', 'Lung']); // hard-coded gene and sample subsets, for demo
	},

	render() {
		var data = this.props.state.transcripts ? (
			<pre style={{width: 500}}>
				{JSON.stringify(this.props.state.transcripts, null, 4).slice(0, 1000)}
			</pre>) : null;
		// var {genetranscripts} = data ? data : null;
		var {genetranscripts} = this.props.state.transcripts ? this.props.state.transcripts : null;

		//for the name column
		var transcriptNameData = genetranscripts ? _.pluck(genetranscripts, 'name') : null;

		//for the exon-intron visualization
		var transcriptExonData = genetranscripts ? (_.map(genetranscripts, t => _.omit(t, ['name', 'chrom', 'expA', 'expB']))) : null;
		console.log("exons", transcriptExonData);

		// for the density plot
		var transcriptDensityData = genetranscripts ? ({
			expA: _.pluck(genetranscripts, "expA"),
			expB: _.pluck(genetranscripts, "expB")
		}) : null;

		return (
			<div ref='datapages'>
				<button onClick={this.onLoadData}>Load Data</button>
				<br/>
				Hello Transcripts
				{data}
				<div>


				</div>

			</div>);
	}
});

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state; // currently unused by Transcripts

// Start the application
connector({...store, controller, main, selector, Page: Transcripts, persist: true, history: false});
