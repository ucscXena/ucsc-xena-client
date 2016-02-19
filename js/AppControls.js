/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./CohortSelect');
var DatasetSelect = require('./DatasetSelect');
//var _ = require('./underscore_ext');
var Button = require('react-bootstrap/lib/Button');

var modeButton = {
	chart: 'Heatmap',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	onMode: function () {
		var {callback, appState: {mode}} = this.props;
		callback([modeEvent[mode]]);
	},
	render: function () {
		var {callback, appState: {cohort, cohorts, samplesFrom, datasets, mode}} = this.props,
			hasCohort = !!cohort;

		return (
			<form className='form-inline'>
				<CohortSelect callback={callback} cohort={cohort} cohorts={cohorts} />
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label className='samplesFromLabel'> Samples in </label>
						{' '}
						<DatasetSelect
							event='samplesFrom'
							callback={callback}
							nullOpt="All Datasets"
							style={{display: hasCohort ?
									'inline' : 'none'}}
							className='samplesFromAnchor'
							datasets={datasets}
							cohort={cohort}
							value={samplesFrom} />
					</div> :
				null}
				{' | '}
				<Button onClick={this.onMode} className='chartSelect' bsStyle='primary'>{modeButton[mode]}</Button>
			</form>
		);
	}
});

module.exports = AppControls;
