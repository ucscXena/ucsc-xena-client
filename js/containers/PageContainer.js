import {CssBaseline, MuiThemeProvider} from '@material-ui/core';
import React from 'react';
import Application from './ApplicationContainer';
import Hub from '../hubPage';
import Datapages from '../Datapages';
import Transcripts from '../transcript_views/TranscriptPage';
import ImportPage from '../import/ImportPage';
import SingleCell from '../SingleCell';
import Img from '../Img';
import PureComponent from '../PureComponent';
import {xenaTheme} from '../xenaTheme';
var {isEqual} = require('../underscore_ext').default;

import {hot} from 'react-hot-loader';
function hotOrNot(component) {
	return module.hot ? hot(module)(component) : component;
}

const pages = {
	'hub': Hub,
	'heatmap': Application,
	'datapages': Datapages,
	'transcripts': Transcripts,
	'import': ImportPage,
	'singlecell': SingleCell,
	'img': Img
};


var ErrorMsg = ({error}) => (
	<div style={{backgroundColor: 'red'}}>
		<h1>Something went wrong</h1>
		{error.toString()}<br/>
		<pre style={{fontSize: '80%', lineHeight: '100%'}}>{error.stack}</pre>
	</div>);

const notFound = () => <p>Oops... can't find this page</p>;
export class PageContainer extends PureComponent {
	state = {error: null}
	componentDidUpdate(oldProps, oldState) {
		if (oldState.error && !isEqual(oldProps.state, this.props.state)) {
			// If app state has changed, try rendering.
			this.setState({error: null}); //eslint-disable-line react/no-did-update-set-state
		}
	}
	render() {
		var {props} = this,
			{page} = props.state,
			{error} = this.state,
			Page = pages[page] || notFound;

		return error ? ErrorMsg({error}) :
			<MuiThemeProvider theme={xenaTheme}><CssBaseline/><Page {...props}/></MuiThemeProvider>;
	}
};

if (process.env.NODE_ENV !== 'production') {
	PageContainer.getDerivedStateFromError = error => ({error});
}

export default hotOrNot(PageContainer);
