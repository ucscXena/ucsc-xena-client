'use strict';
const React = require('react');
var Application = require('./ApplicationContainer');
var Hub = require('../hubPage');
var Datapages = require('../Datapages');
const Transcripts = require('../transcript_views/TranscriptPage');

var pages = {
	'hub': Hub,
	'heatmap': Application,
	'datapages': Datapages,
	'transcripts': Transcripts
};

var notFound = () => <p>Oops... can't find this page</p>;

var PageContainer = React.createClass({
	render() {
		var {page} = this.props.state,
			Page = pages[page] || notFound;
		return <Page {...this.props}/>;

	}
});

module.exports = PageContainer;
