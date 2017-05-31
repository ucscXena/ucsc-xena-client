'use strict';

require('./base');
// import controller for the transcript view actions
var controller = require('./controllers/transcripts');
const React = require('react');
const connector = require('./connector');
const createStore = require('./store');

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
		return (
			<div ref='datapages'>
				<button onClick={this.onLoadData}>Load Data</button>
				<br/>
				Hello Transcripts
				{data}
			</div>);
	}
});

var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state.servers;

// Start the application
connector({...store, controller, main, selector, Page: Transcripts, persist: true, history: false});
