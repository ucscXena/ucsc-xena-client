
'use strict';

var React = require('react');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
import AppBar from 'react-toolbox/lib/app_bar';
var konami = require('./konami');
var {deepPureRenderMixin} = require('./react-utils');
var widgets = require('./columnWidgets');
var classNames = require('classnames');

// Styles
var compStyles = require('./AppControls.module.css');

var modeIcon = {
	chart: 'view_column',
	heatmap: 'insert_chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
};

var modeHelp = {
	chart: 'View as columns',
	heatmap: 'View as chart'
};

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

var asciiB = 66;

// XXX drop this.props.style? Not sure it's used.
var AppControls = React.createClass({
	mixins: [deepPureRenderMixin],
	componentWillMount() {
		this.nsub = konami(asciiB).subscribe(() => {
			this.props.callback(['notifications-enable']);
		});
	},
	componentWillUnmount() {
		this.nsub.unsubscribe();
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
	onCohortSelect: function (value) {
		this.props.callback(['cohort', 0 /* index into composite cohorts */, value]);
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
	onShowWelcome: function () {
		this.props.onShowWelcome();
	},
	render: function () {
		var {appState: {cohort, mode, columnOrder, showWelcome, samples},
				onReset, children, help, onResetSampleFilter} = this.props,
			cohortName = _.get(cohort, 'name'),
			hasColumn = !!columnOrder.length,
			noshow = (mode !== "heatmap"),
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			sampleFilter = _.get(cohort, 'sampleFilter'),
			filter = sampleFilter ? <span onClick={onResetSampleFilter} className={compStyles.appliedFilter}>Filtered to </span> : null,
			fraction = count === samples.length ? '' :
				`- Zoomed to ${index + 1} - ${index + count}`;
		return (
				<AppBar>
					<div className={classNames(compStyles.appBarContainer, compStyles.cohort)}>
						<div className={compStyles.titleContainer}>
							<span className={compStyles.title}>{cohortName}</span>
							<span className={compStyles.subtitle}>{filter} {samples.length} Samples {fraction ? fraction : null}</span>
						</div>
						<i className='material-icons' onClick={this.onRefresh} title='Reload cohort data'>refresh</i>
						<i className='material-icons' onClick={() => onReset()} title='Pick new cohort'>close</i>
					</div>
					<div className={classNames(compStyles.appBarContainer, compStyles.tools)}>
						<div className={compStyles.filter}>
							{children}
							{help ? <a href={help} target='_blank' className={compStyles.filterHelp}><i className='material-icons'>help_outline</i></a> : null}
						</div>
						<div className={compStyles.actions}>
							{hasColumn ? <i className='material-icons' onClick={this.onMode} title={modeHelp[mode]}>{modeIcon[mode]}</i> : null}
							{(noshow || !hasColumn) ? null : <i className='material-icons' onClick={this.onPdf} title='Download as PDF'>picture_as_pdf</i> }
							{hasColumn ? <i className='material-icons' onClick={this.onDownload} title='Download as tsv'>cloud_download</i> : null}
							{showWelcome ? null : <i className='material-icons' onClick={this.onShowWelcome}>help</i>}
						</div>
					</div>
				</AppBar>
		);
	}
});

module.exports = AppControls;
