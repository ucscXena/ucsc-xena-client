
'use strict';

var React = require('react');
var pdf = require('./pdfSpreadsheet');
var _ = require('./underscore_ext');
import AppBar from 'react-toolbox/lib/app_bar';
import {IconMenu, MenuItem, MenuDivider} from 'react-toolbox/lib/menu';
var Rx = require('./rx');
var {createBookmark} = require('./bookmark');
var konami = require('./konami');
var config = require('./config');
var {deepPureRenderMixin} = require('./react-utils');
var widgets = require('./columnWidgets');
var classNames = require('classnames');

// Styles
var compStyles = require('./AppControls.module.css');

var modeIcon = {
	chart: 'image',
	heatmap: 'insert_chart'
};

var modeEvent = {
	chart: 'heatmap',
	heatmap: 'chart'
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
		this.ksub.unsubscribe();
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
		var {getState} = this.props;
		Rx.Observable.ajax({
			method: 'POST',
			url: '/api/bookmarks/bookmark',
			responseType: 'text',
			headers: {
				'X-CSRFToken': document.cookie.replace(/.*csrftoken=([0-9a-z]+)/, '$1'),
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: `content=${encodeURIComponent(createBookmark(getState()))}`
		}).subscribe(this.onSetBookmark);
	},
	onCopyBookmarkToClipboard: function() {
		this.bookmarkEl.select();
		document.execCommand('copy');
	},
	onExport: function() {
		var {getState} = this.props;
		var url = URL.createObjectURL(new Blob([JSON.stringify(getState())], { type: 'application/json' }));
		var a = document.createElement('a');
		var filename = 'xenaState.json';
		_.extend(a, { id: filename, download: filename, href: url });
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	},
	onImport: function () {
		this.refs.import.click();
	},
	onImportSelected: function (ev) {
		var file = ev.target.files[0],
			reader = new FileReader(),
			{callback} = this.props;

		reader.onload = () => callback(['import', JSON.parse(reader.result)]);
		reader.readAsText(file);
		ev.target.value = null;
	},
	onShowWelcome: function () {
		this.props.onShowWelcome();
	},
	render: function () {
		var {appState: {cohort: activeCohorts, mode, columnOrder, showWelcome},
				onReset, children, help, matches} = this.props,
			{bookmarks, bookmark} = this.state,
			cohort = _.getIn(activeCohorts, [0, 'name']),
			hasColumn = !!columnOrder.length,
			noshow = (mode !== "heatmap"),
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			fraction = count === matches ? '' :
				`- Zoomed to ${index + 1} - ${index + count} (N=${count})`;
		// min-width specified on first MenuItem of bookmark menu is a hack to force menu items to extend full
		// width for both no bookmark and bookmark states. RTB positions and clips the menu content according to the
		// initial menu item content which causes problems when we move from the "Your Bookmark is Loading" to "Copy to Clipboard"
		// states. Do not remove this inline style!
		return (
				<AppBar>
					<div className={classNames(compStyles.appBarContainer, compStyles.cohort)}>
						<div className={compStyles.titleContainer}>
							<span className={compStyles.title}>{cohort}</span>
							<span className={compStyles.subtitle}>{matches} Samples {fraction ? fraction : null}</span>
						</div>
						<i className='material-icons' onClick={this.onRefresh}>refresh</i>
						<i className='material-icons' onClick={() => onReset()}>close</i>
					</div>
					<div className={classNames(compStyles.appBarContainer, compStyles.tools)}>
						<div className={compStyles.filter}>
							{children}
							{help ? <a href={help} target='_blank' className={compStyles.filterHelp}><i className='material-icons'>help_outline</i></a> : null}
						</div>
						<div className={compStyles.actions}>
							{hasColumn ? <i className='material-icons' onClick={this.onMode}>{modeIcon[mode]}</i> : null}
							{bookmarks ?
								[<IconMenu className={compStyles.iconBookmark} icon='bookmark' onShow={this.onBookmark} iconRipple={false}>
									<MenuItem style={{minWidth: 218}} onClick={this.onExport} caption='Export'/>
									<MenuItem onClick={this.onImport} caption='Import'/>
									<MenuDivider/>
									{bookmark ? [<MenuItem onClick={this.onCopyBookmarkToClipboard}
														   caption='Copy Bookmark'/>,
												<input className={compStyles.bookmarkInput} ref={(input) => this.bookmarkEl = input} value={bookmark}/>] :
										<MenuItem disabled={true} caption='Your Bookmark is Loading'/>}
								</IconMenu>,
									<input className={compStyles.importInput} ref='import' id='import' onChange={this.onImportSelected} type='file'/>]
								: null}
							{(noshow || !hasColumn) ? null : <i className='material-icons' onClick={this.onPdf}>picture_as_pdf</i> }
							{hasColumn ? <i className='material-icons' onClick={this.onDownload}>cloud_download</i> : null}
							{showWelcome ? null : <i className='material-icons' onClick={this.onShowWelcome}>help</i>}
						</div>
					</div>
				</AppBar>
		);
	}
});

module.exports = AppControls;
