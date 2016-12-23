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
var config = require('./config');
var {deepPureRenderMixin} = require('./react-utils');
var widgets = require('./columnWidgets');

var modeButton = {
	chart: 'Visual Spreadsheet',
	heatmap: 'Chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

var uiHelp = {
	'pdf': ['top', 'Save PDF of this view'],
	'reload': ['top', 'Reload cohorts from all hubs'],
	'chart': ['top', 'Switch to spreadsheet view of this data'],
	'heatmap': ['top', 'Switch to chart view of this data'],
	'samples': ['top', 'Limit samples by dataset'],
	'cohort': ['top', 'Change cohort'],
	'download': ['top', 'Download all dense columns']
};

function addHelp(id, target) {
	var [placement, text] = uiHelp[id],
		tooltip = <Tooltip>{text}</Tooltip>;
	return (
		<OverlayTrigger trigger={['hover']} key={id} placement={placement} overlay={tooltip}>
			{target}
		</OverlayTrigger>);
}

function download([fields, rows]) {
	var txt = _.map([fields].concat(rows), row => row.join('\t')).join('\n');
	// use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
	var url = URL.createObjectURL(new Blob([txt], { type: 'text/tsv' }));
	var a = document.createElement('a');
	var filename = 'denseDataOnlyDownload.tsv';
	_.extend(a, { id: filename, download: filename, href: url });
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

var asciiA = 65;

var bookmarksDefault = false;
if (process.env.NODE_ENV !== 'production') {
	bookmarksDefault = true;
}

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		return {bookmarks: bookmarksDefault};
	},
	enableBookmarks() {
		this.setState({bookmarks: true});
	},
	componentWillMount() {
		this.ksub = konami(asciiA).subscribe(this.enableBookmarks);
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
		this.setState({bookmark: `${location.origin}${config.baseurl}heatmap/?bookmark=${id}`});
	},
	onResetBookmark() {
		this.setState({bookmark: null});
	},
	onDownload: function () {
		var {sampleFormat} = this.props,
			{samples, columns, columnOrder, index, data} = this.props.appState,
			// only download rectangular data
			rectData = columnOrder.filter(id => _.contains(['float', 'coded', 'segmented'], columns[id].valueType)),
			// Each dataset is two element array: [headers, [rows]]
			datasets = rectData.map(id =>
				widgets.download({samples, column: columns[id], index: index[id], data: data[id], sampleFormat})),
			combinedRows = _.mmap(..._.pluck(datasets, 1), (...rows) => {
				rows.pop(); // mmap passes index
				return [...rows[0], ..._.flatten(rows.slice(1).map(cols => cols.slice(1)))];
			}),
			combinedHeaders = _.flatmap(datasets, ([headers], i) =>
				i === 0 ? headers : headers.slice(1));

		download([combinedHeaders, combinedRows]);
	},
	onBookmark: function () {
		var {appState} = this.props;
		Rx.DOM.ajax({
			method: 'POST',
			url: '/api/bookmarks/bookmark',
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

		return (
			<form className='form-inline'>
				{addHelp('reload',
					<Button onClick={this.onRefresh} bsSize='sm' style={{marginRight: 5}}>
						<span className="glyphicon glyphicon-refresh" aria-hidden="true"/>
					</Button>)}
				{addHelp('cohort', <CohortSelect cohort={cohort} cohorts={cohorts} disable={noshow} onSelect={this.onCohortSelect}/>)}
				{' '}
				{hasCohort ?
					<div className='form-group' style={this.props.style}>
						<label> Samples in </label>
						{' '}
						{addHelp('samples',
							<DatasetSelect
								disable={noshow}
								onSelect={this.onSamplesSelect}
								nullOpt="Any Datasets (i.e. show all samples)"
								style={{display: hasCohort ? 'inline' : 'none'}}
								datasets={datasets}
								cohort={cohort}
								value={samplesFrom} />)}
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
				{hasColumn ?
					addHelp(mode, <Button disabled={!hasColumn} onClick={this.onMode} bsStyle='primary'>
						{modeButton[mode]}
					</Button>) : null}
				{' '}
				{(noshow || !hasColumn) ? null :
					addHelp('pdf', <Button onClick={this.onPdf}>PDF</Button>)}
				{hasColumn ? addHelp('download', <Button onClick={this.onDownload}>Download</Button>) : null}
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
