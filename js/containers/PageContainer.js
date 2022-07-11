import {CssBaseline, MuiThemeProvider} from '@material-ui/core';
import React from 'react';
import Application from './ApplicationContainer';
import Hub from '../hubPage';
import Datapages from '../Datapages';
import Transcripts from '../transcript_views/TranscriptPage';
import ImportPage from '../import/ImportPage';
import {xenaTheme} from '../xenaTheme';

import {hot} from 'react-hot-loader';
function hotOrNot(component) {
	return module.hot ? hot(module)(component) : component;
}

const pages = {
	'hub': Hub,
	'heatmap': Application,
	'datapages': Datapages,
	'transcripts': Transcripts,
	'import': ImportPage
};
const notFound = () => <p>Oops... can't find this page</p>;
const PageContainer = (props) => {
	let { page } = props.state;
	let Page = pages[page] || notFound;
	return <MuiThemeProvider theme={xenaTheme}><CssBaseline/><Page {...props}/></MuiThemeProvider>;
};

export default hotOrNot(PageContainer);
