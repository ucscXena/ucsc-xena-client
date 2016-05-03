/*global require: false, module: false */

'use strict';

var React = require('react');
var CohortSelect = require('./CohortSelect');
var DatasetSelect = require('./DatasetSelect');
var Button = require('react-bootstrap/lib/Button');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');

var modeButton = {
	chart: 'Heatmap',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

// XXX drop this.props.style? Not sure it's used.
var CohortControls = React.createClass({
	onMode: function () {
		var {mode} = this.props;
		this.props.onMode(modeEvent[mode]);
	},
	render: function () {
		var {onRefresh, onPdf, onSamplesSelect, onCohortSelect, cohortOnly, hasColumn,
				onRemove, cohort, cohorts, samplesFrom, datasets, mode} = this.props,
			hasCohort = !!cohort,
			visibility = (cohortOnly || !hasColumn) ? 'hidden' : 'visible',
			removeVisibility = hasCohort ? 'visible' : 'hidden',
			refreshVisibility = onRefresh ? 'visible' : 'hidden',
			disableMenus = (mode === modeEvent.heatmap);

		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		return (
			<form className='form-inline'>
				<span style={{visibility: refreshVisibility}}>
					<OverlayTrigger placement="top" overlay={tooltip}>
						<Button onClick={onRefresh} bsSize='sm' style={{marginRight: 5}}>
							<span className="glyphicon glyphicon-refresh" aria-hidden="true"/>
						</Button>
					</OverlayTrigger>
				</span>
				<span style={{visibility: removeVisibility}}>
					<Button onClick={onRemove} bsSize='sm' style={{marginRight: 5}}>
						<span className="glyphicon glyphicon-remove" aria-hidden="true"/>
					</Button>
				</span>
				<CohortSelect onSelect={onCohortSelect} cohort={cohort} cohorts={cohorts} disable={disableMenus}/>
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label className='samplesFromLabel'> Samples in </label>
						{' '}
						<DatasetSelect
							onSelect={onSamplesSelect}
							nullOpt="Any Datasets (i.e. show all samples)"
							style={{display: hasCohort ?
									'inline' : 'none'}}
							className='samplesFromAnchor'
							datasets={datasets}
							cohort={cohort}
							disable={disableMenus}
							value={samplesFrom} />
					</div> :
				null}
				<span style={{visibility}}>
					{' | '}
					<Button onClick={this.onMode} className='chartSelect' bsStyle='primary'>{modeButton[mode]}</Button>
					{' | '}
					<Button onClick={onPdf}>PDF</Button>
				</span>
			</form>
		);
	}
});

module.exports = CohortControls;

