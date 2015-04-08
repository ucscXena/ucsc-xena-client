/*global require: false, module: false */

'use strict';

var React = require('react');
var L = require('./lenses/lens');
var Ls = require('./lenses/lenses');
var CohortSelect = require('./cohortSelect');
var DatasetSelect = require('./datasetSelect');
var _ = require('./underscore_ext');
var Button = require('react-bootstrap/lib/Button');

// Lens to reset samplesFrom if cohort changes.
var resetSamplesFrom = L.lens(
		x => x,
		(x, v) => (x.cohort === v.cohort) ? v :
			_.assoc(v, 'samplesFrom', null));

var rename = L.lens(
		({samplesFrom, ...others}) => _.assoc(others, 'dataset', samplesFrom),
		(x, {dataset, ...others}) => _.assoc(others, 'samplesFrom', dataset));

var AppControls = React.createClass({
	render: function () {
		var cohortLens = _.compose(
				this.props.lens, resetSamplesFrom, Ls.keys(['cohort', 'servers'])),
			datasetLens = _.compose(
				this.props.lens, Ls.keys(['samplesFrom', 'servers']), rename),
			hasCohort = !!L.view(this.props.lens).cohort;

		return (
			<form className='form-inline'>
				<CohortSelect lens={cohortLens} />
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label className='samplesFromLabel'> Samples in </label>
						{' '}
						<DatasetSelect
							nullOpt="All Datasets"
							style={{display: L.view(this.props.lens).cohort ?
									'inline' : 'none'}}
							className='samplesFromAnchor'
							datasets={this.props.datasets}
							lens={datasetLens} />
					</div> :
				null}
				{' | '}
				<Button className='chartSelect' bsStyle='primary'>Chart</Button>
			</form>
		);
	}
});

module.exports = AppControls;
