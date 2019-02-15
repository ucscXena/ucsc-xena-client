'use strict';

import PureComponent from './PureComponent';
var React = require('react');
require('react-resizable/css/styles.css');
var getColumns = require('./views/Columns');
import SampleZoomIndicator from './views/SampleZoomIndicator';

// Styles
require('./Columns.css'); // XXX switch to js styles
var compStyles = require('./Spreadsheet.module.css');

var getSpreadsheet = columnsWrapper => {
	var Columns = getColumns(columnsWrapper);
	return class extends PureComponent {
	    static displayName = 'Spreadsheet';

	    render() {
			var {appState: {data, addColumnAddHover, columns, enableTransition, samples, zoom}, children, ...otherProps} = this.props;
			return (
				<div className={compStyles.Spreadsheet}>
					{zoom.count < samples.length ? <SampleZoomIndicator column={columns.samples} addColumnAddHover={addColumnAddHover} enableTransition={enableTransition} data={data.samples} samples={samples} zoom={zoom}/> : null }
					<Columns appState={this.props.appState} {...otherProps}>
						{children}
					</Columns>
				</div>
			);
		}
	};
};

module.exports = getSpreadsheet;
