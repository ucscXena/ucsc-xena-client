
import PureComponent from './PureComponent';
import React from 'react';
import {Box} from '@material-ui/core';
import 'react-resizable/css/styles.css';
import getColumns from './views/Columns.js';
import SampleZoomIndicator from './views/SampleZoomIndicator';
// register spreadsheet methods
import './plotDenseMatrix';
import './plotMutationVector';
import './plotSegmented';
import './plotSamples';

// Styles
import './Columns.css'; // XXX switch to js styles

var getSpreadsheet = columnsWrapper => {
	var Columns = getColumns(columnsWrapper);
	return class extends PureComponent {
	    static displayName = 'Spreadsheet';

	    render() {
			var {appState: {data, addColumnAddHover, columns, enableTransition, samples, wizardMode, zoom}, children, ...otherProps} = this.props;
			return (
				<Box display='flex' py={wizardMode ? 8 : 12}>
					{zoom.count < samples.length ? <SampleZoomIndicator column={columns.samples} addColumnAddHover={addColumnAddHover} enableTransition={enableTransition} data={data.samples} samples={samples} zoom={zoom}/> : null }
					<Columns appState={this.props.appState} {...otherProps}>
						{children}
					</Columns>
				</Box>
			);
		}
	};
};

export default getSpreadsheet;
