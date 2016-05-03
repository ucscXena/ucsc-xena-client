/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortControls = require('./views/CohortControls');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');

var AppControls = React.createClass({
	onMode: function (mode) {
		this.props.callback([mode]);
	},
	onRefresh: function () {
		var {callback} = this.props;
		callback(['refresh-cohorts']);
	},
	onRemove: function (index) {
		var {callback} = this.props;
		callback(['cohort-remove', index]);
	},
	onPdf: function () {
		pdf(this.props.appState);
	},
	onSamplesSelect: function (index, value) {
			this.props.callback(['samplesFrom', index, value]);
	},
	onCohortSelect: function (index, value) {
			this.props.callback(['cohort', index, value]);
	},
	render: function () {
		var {cohort, cohorts, datasets, mode, columnOrder} = this.props.appState,
			hasColumn = !!columnOrder.length,
			controls = cohort.map(({name, samplesFrom}, i) => (
				<CohortControls
					key={i}
					cohortOnly={i > 0}
					hasColumn={hasColumn}
					cohort={name}
					cohorts={cohorts}
					samplesFrom={samplesFrom}
					datasets={_.where(datasets, {cohort: name})}
					mode={mode}
					onMode={this.onMode}
					onRefresh={i === 0 ? this.onRefresh : null}
					onRemove={_.partial(this.onRemove, i)}
					onPdf={this.onPdf}
					onSamplesSelect={_.partial(this.onSamplesSelect, i)}
					onCohortSelect={_.partial(this.onCohortSelect, i)}/>
			));

		return (
			<div>
				{controls}
				<CohortControls
					key={cohort.length}
					onRefresh={cohort.length === 0 ? this.onRefresh : null}
					cohortOnly={true}
					cohorts={cohorts}
					onCohortSelect={_.partial(this.onCohortSelect, cohort.length)}/>
			</div>
		);
	}
});

module.exports = AppControls;
