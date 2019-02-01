'use strict';
import React from 'react';
import Application from './ApplicationContainer';
import  Hub  from '../hubPage';
import Datapages from '../Datapages';
import Transcripts from '../transcript_views/TranscriptPage';
import {hot} from 'react-hot-loader';
import {overrideComponentTypeChecker} from 'react-toolbox';
import ImportPage from '../import/ImportPage';

// react hot loader messes up class checks in react-toolbox. Override
// the class checker in dev.
function defaultChecker(classType, reactElement) {
	if (process.env.NODE_ENV !== 'production') {
      // https://github.com/gaearon/react-hot-loader/blob/v3.0.0-beta.7/docs/Known%20Limitations.md#checking-element-types
      classType = React.createElement(classType).type;// eslint-disable-line no-param-reassign
	}
  return reactElement && reactElement.type === classType;
}

overrideComponentTypeChecker(defaultChecker);

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
	return <Page {...props}/>;
};

export default hot(module)(PageContainer);
