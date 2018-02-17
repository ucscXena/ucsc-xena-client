'use strict';
import React from 'react';
import Application from './ApplicationContainer';
import  Hub  from '../hubPage';
import Datapages from '../Datapages';
import Transcripts from '../transcript_views/TranscriptPage';

const pages = {
	'hub': Hub,
	'heatmap': Application,
	'datapages': Datapages,
	'transcripts': Transcripts
};
const notFound = () => <p>Oops... can't find this page</p>;
const PageContainer = (props) => {
	let { page } = props.state;
	let Page = pages[page] || notFound;
	return <Page {...props}/>;
};

module.exports = PageContainer;
