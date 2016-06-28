/*global require: false, module: false, document: false */

'use strict';

var React = require('react');
var CohortSelect = require('./views/CohortSelect');
var DatasetSelect = require('./views/DatasetSelect');
var Button = require('react-bootstrap/lib/Button');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
require('./AppControls.css');
var Rx = require('rx-dom');
var {createBookmark} = require('./bookmark');
var konami = require('./konami');
var Popover = require('react-bootstrap/lib/Popover');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');

var modeButton = {
	chart: 'Visual Spreadsheet',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	getInitialState() {
		return {bookmarks: false};
	},
	enableBookmarks() {
		this.setState({bookmarks: true});
	},
	componentWillMount() {
		this.ksub = konami.subscribe(this.enableBookmarks);
	},
	componentWillUnmount() {
		this.ksub.dispose();
	},
	onMode: function () {
		var {callback, appState: {mode}} = this.props;
		callback([modeEvent[mode]]);
	},
	onRefresh: function () {
		var {callback} = this.props;
		callback(['refresh-cohorts']);
	},
	onPdf: function () {
		pdf(this.props.appState);
	},
	onSamplesSelect: function (value) {
		this.props.callback(['samplesFrom', 0 /* index into composite cohorts */, value]);
	},
	onCohortSelect: function (value) {
		this.props.callback(['cohort', 0 /* index into composite cohorts */, value]);
	},
	onResetSampleFilter: function () {
		this.props.callback(['sampleFilter', 0 /* index into composite cohorts */, null]);
	},
	onSetBookmark(resp) {
		var {id} = JSON.parse(resp.response);
		this.setState({bookmark: `https://genome-cancer.ucsc.edu/proj/site/xena/?bookmark=${id}`});
	},
	onResetBookmark() {
		this.setState({bookmark: null});
	},
	onBookmark: function () {
		var {appState} = this.props;
		Rx.DOM.ajax({
			method: 'POST',
			url: '/proj/site/bookmarks',
			headers: {
				'X-CSRFToken': document.cookie.replace(/.*csrftoken=([0-9a-z]+)/, '$1'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `content=${encodeURIComponent(createBookmark(appState))}`
		}).subscribe(this.onSetBookmark);
	},
	render: function () {
		var {appState: {cohort: activeCohorts, cohorts, datasets, mode, columnOrder}} = this.props,
			{bookmarks, bookmark} = this.state,
			cohort = _.getIn(activeCohorts, [0, 'name']),
			samplesFrom = _.getIn(activeCohorts, [0, 'samplesFrom']),
			sampleFilter = _.getIn(activeCohorts, [0, 'sampleFilter']),
			hasCohort = !!cohort,
			hasColumn = !!columnOrder.length,
			noshow = (mode !== "heatmap");

		const tooltip = <Tooltip id='reload-cohorts'>Reload cohorts from all hubs.</Tooltip>;
		return (
			<form className='form-inline'>
				<OverlayTrigger placement="top" overlay={tooltip}>
					<Button onClick={this.onRefresh} bsSize='sm' style={{marginRight: 5}}>
						<span className="glyphicon glyphicon-refresh" aria-hidden="true"/>
					</Button>
				</OverlayTrigger>
				<CohortSelect cohort={cohort} cohorts={cohorts} disable={noshow} onSelect={this.onCohortSelect}/>
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label> Samples in </label>
						{' '}
						<DatasetSelect
							disable={noshow}
							onSelect={this.onSamplesSelect}
							nullOpt="Any Datasets (i.e. show all samples)"
							style={{display: hasCohort ? 'inline' : 'none'}}
							datasets={datasets}
							cohort={cohort}
							value={samplesFrom} />
						{sampleFilter ?
							(<span>
								&#8745;
								<Button disabled={noshow} className='hoverStrike'
									onClick={this.onResetSampleFilter}>

									{sampleFilter.length} samples
								</Button>
							</span>) : null}
					</div> : null}
				{' '}
				{hasColumn ? <Button disabled={!hasColumn} onClick={this.onMode} bsStyle='primary'>{modeButton[mode]}</Button> : null}
				{' '}
				{(noshow || !hasColumn) ? null : <Button onClick={this.onPdf}>PDF</Button>}
				{bookmarks ?
					<OverlayTrigger onEnter={this.onBookmark} trigger='click' placement='bottom'
						overlay={<Popover placement='bottom'><p>Your bookmark is {bookmark || 'loading'}</p></Popover>}>
						<Button>Bookmark</Button>
					</OverlayTrigger> : null}
			</form>
		);
	}
});

module.exports = AppControls;
