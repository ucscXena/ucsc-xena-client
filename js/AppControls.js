/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./cohortSelect');
var DatasetSelect = require('./datasetSelect');
//var _ = require('./underscore_ext');
var Button = require('react-bootstrap/lib/Button');

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	render: function () {
		var {callback, appState: {cohort, cohorts, samplesFrom, datasets}} = this.props;
		var hasCohort = !!cohort;

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
				<Button className='chartSelect' bsStyle='primary'>Chart</Button>
			</form>
		);
	}
});

module.exports = AppControls;
