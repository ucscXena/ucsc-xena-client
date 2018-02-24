'use strict';

require('./base');
const React = require('react');
var {uniq, flatten, sortBy, groupBy, map, flatmap, partitionN, mapObject,
	pluck, concat, where, contains, get, updateIn, range, Let,
	zip, identity, getIn, sum, keys, values, mmap} = require('./underscore_ext');
var {Observable: {from}, Scheduler: {animationFrame}} = require('./rx');
var {parseDsID} = require('./xenaQuery');
import Link from 'react-toolbox/lib/link';
var styles = require('./Datapages.module.css');
var nav = require('./nav');
var {serverNames} = require('./defaultServers');
import {Checkbox} from 'react-toolbox/lib/checkbox';
import {Button} from 'react-toolbox/lib/button';
var showdown = require('showdown');
var {stripHTML} = require('./dom_helper');
var treehouseImg = require('../images/Treehouse.jpg');
var {rxEventsMixin} = require('./react-utils');
var {servers: {localHub}} = require('./defaultServers');
import Dialog from 'react-toolbox/lib/dialog';
var {encodeObject, urlParams} = require('./util');
import {ThemeProvider} from 'react-css-themr';
var appTheme = require('./appTheme');

var getHubName = host => get(serverNames, host, host);

var pluralize = (str, count) => count === 1 ? `1 ${str}` : `${count} ${str}s`;

//
// event handler for navigating within datapages. Prevents page load, and
// sets url params.
//

var navHandler = paramFn => {
	return function(ev) {
		ev.preventDefault();
		this.props.callback(['navigate', 'datapages', paramFn(ev, this.props.state)]);
	};
};

//var paramFromDataset = ev => ev.target.parentElement.dataset;

// Get params from the anchor href. With RT Link, the anchor is parentElement.
var paramFromHref = ev => mapObject(urlParams(ev.target.parentElement.href), a => a[0]);

var getUserServers = servers => keys(servers).filter(k => servers[k].user);

//
// Data hubs sidebar
//

var hubLink = (host, onClick) => (
	<Link
		className={styles.link}
		href={'?' + encodeObject({host})}
		label={getHubName(host)}
		onClick={onClick}/>);

var DataHubs = React.createClass({
	onHub: navHandler(paramFromHref),
	onSelect(isOn, ev) {
		var {checked} = ev.target,
			host = ev.target.getAttribute('data-host');
		this.props.callback([checked ? 'enable-host' : 'disable-host', host, 'user']);
	},
	render() {
		var {spreadsheet: {servers}} = this.props.state;
		return (
			<div className={styles.dataHubs}>
				<h2>Active Data Hubs</h2>
				<ul>
					{map(servers,
						({user}, host) => (
							<li>
								<Checkbox
									label={hubLink(host, this.onHub)}
									onChange={this.onSelect}
									checked={user}
									data-host={host}/>
							</li>))}
				</ul>
			</div>);
	}
});


//
// Cohort Summary Page
//

var treehouse = cohort =>
	cohort.search(/^Treehouse/gi) === -1 ? null :
	<img src={treehouseImg} height='40px'/>;

var cohortLink = (cohort, onClick) => (
	<Link
		className={styles.link}
		href={'?' + encodeObject({cohort})}
		label={cohort}
		onClick={onClick}/>);

var collateCohorts = hubCohorts =>
	concat(...pluck(hubCohorts, 'cohorts')).reduce(
		(acc, cohort) => updateIn(acc, [cohort.cohort],
			(v = 0) => cohort.count + v),
		{});

var CohortSummary = ({cohorts, onCohort}) => {
	var names = sortBy(keys(cohorts), c => c.toLowerCase()),
		nCohorts = names.length,
		nDatasets = sum(values(cohorts));
	return (
		<div>
			<h2>{pluralize('Cohort', nCohorts)}, {pluralize('Dataset', nDatasets)}</h2>
			<ul className={styles.list}>
				{map(names, name =>
					<li>
						{treehouse(name)}
						{cohortLink(name, onCohort)}
						{` (${pluralize('dataset', cohorts[name])})`}
					</li>)}
			</ul>
		</div>);
};

var CohortSummaryPage = React.createClass({
	onCohort: navHandler(paramFromHref),
	render() {
		var {state} = this.props,
			{spreadsheet: {servers}} = state,
			userServers = getUserServers(servers),
			cohorts = getIn(this.props.state, ['datapages', 'cohorts'], []),
			activeCohorts = cohorts.filter(c => contains(userServers, c.server)),
			combined = collateCohorts(activeCohorts);
		return (
			<div className={styles.datapages}>
				<DataHubs {...this.props}/>
				<CohortSummary cohorts={combined} onCohort={this.onCohort}/>
			</div>);
	}
});

//
// Dataset delete button
//

var DeleteButton = React.createClass({
	getInitialState() {
		return {active: false};
	},
	onDelete() {
		this.setState({active: !this.state.active});
	},
	onReally() {
		var {name} = this.props;
		this.props.callback(['navigate', 'datapages', {host: localHub}]);
		this.props.callback(['delete-dataset', localHub, name]);
	},
	actions() {
		return [
			{label: 'Cancel', onClick: this.onDelete},
			{label: 'Really Delete', onClick: this.onReally}];
	},
	render() {
		var {active} = this.state,
			{label} = this.props;
		return (
			<div className={styles.deleteButton}>
				<Dialog actions={this.actions()} active={active}
						onEscKeyDown={this.onDelete} onOverlayClick={this.onDelete}
						title='Delete dataset'>
					{label}
				</Dialog>
				<Button onClick={this.onDelete} accent>Delete</Button>
			</div>);
	}
});

var canDelete = ({status}, host) =>
	host === localHub && contains(['loaded', 'error'], status);

var markdownValue = value => {
	if (value) {
		var converter = new showdown.Converter();
		return (<div className={styles.header}
			dangerouslySetInnerHTML={{__html: converter.makeHtml(value)}}/>);
	}
};

//
// Cohort Datasets Page
//

var datasetLink = (callback, preferred, onClick) => ds => {
	var [host] = parseDsID(ds.dsID);
	return (
		<li>
			<Link
				className={styles.link}
				href={'?' + encodeObject({dataset: ds.name, host})}
				label={ds.label}
				onClick={onClick}/>
			{preferred.has(ds.dsID) ? <span className={styles.star}>*</span> : null}
			{ds.status !== 'loaded' ?
				<span className={styles.count}> [{ds.status}]</span> : null}
			{ds.status === 'loaded' ?
				<span className={styles.count}> (n={(ds.count || 0).toLocaleString()})</span> :
				null}
			<span> {getHubName(host)}</span>
			{canDelete(ds, host) ?
				<DeleteButton callback={callback} name={ds.name} label={ds.label || ds.name}/> : null}
			<div className={styles.lineClamp}>
				<span className={styles.description}>{stripHTML(ds.description)}</span>
			</div>
		</li>);
};

var drawGroup = (callback, groups, preferred, onClick) => dataSubType => {
	var list = sortBy(groups[dataSubType], g => g.label.toLowerCase());
	return (
		<div>
			<h3>{dataSubType}</h3>
			<ul className={styles.groupList}>
				{map(list, datasetLink(callback, preferred, onClick))}
			</ul>
		</div>);
};

var COHORT_NULL = '(unassigned)';

var getPreferred = (wizard, cohort) =>
	new Set(values(getIn(wizard, ['cohortPreferred', cohort], {})));

var CohortPage = React.createClass({
	onViz() {
		var {datapages, spreadsheet: {cohort: currentCohort}} = this.props.state,
			cohort = getIn(datapages, ['cohort', 'cohort'], COHORT_NULL);

		if (cohort !== get(currentCohort, 'name')) {
			this.props.callback(['cohort', cohort]);
		}
		this.props.callback(['navigate', 'heatmap']);
	},
	onDataset: navHandler(paramFromHref),
	render() {
		var {datapages, params, wizard} = this.props.state,
			cohort = getIn(datapages, ['cohort', 'cohort']) === params.cohort ?
				datapages.cohort : {cohort: '...', datasets: []},
			{callback} = this.props,
			dsGroups = groupBy(values(cohort.datasets), 'dataSubType'),
			dataSubTypes = sortBy(keys(dsGroups), g => g.toLowerCase()),
			preferred = getPreferred(wizard, params.cohort);

		return (
			<div className={styles.datapages}>
				{markdownValue(cohort.meta)}
				<div className={styles.sidebar}>
					<Button onClick={this.onViz} accent>Visualize</Button>
				</div>
				<h2>cohort: {treehouse(cohort.cohort)}{cohort.cohort}</h2>
				{dataSubTypes.map(drawGroup(callback, dsGroups, preferred, this.onDataset))}
				{preferred.size === 0 ? null : (
					<span>
						<span className={styles.star}>*</span>
						<span>default dataset in visualization</span>
					</span>)}
			</div>);
	}
});

//
// Dataset Page
//

var TYPE_NULL = 'genomicMatrix',
	FORMAT_MAPPING = {
		'clinicalMatrix': "ROWs (samples)  x  COLUMNs (identifiers) (i.e. clinicalMatrix)",
		'genomicMatrix': "ROWs (identifiers)  x  COLUMNs (samples) (i.e. genomicMatrix)",
		'mutationVector': "Variant by Position (i.e. mutationVector)",
		'genomicSegment': 'Genomic Segment (i.e. genomicSegment)',
		'unknown': "unknown"
	};

var dataPair = (key, value, method = identity) => value == null ? [] : [
	<span className={styles.key}>{key}</span>,
	<span className={styles.value}>{method(value)}</span>,
	<br/>];

var toLink = value => <a href={value}>{value}</a>;
var toCohortLink = onClick => cohort => (
	<Link
		href={'?' + encodeObject({cohort})}
		onClick={onClick}
		label={cohort}/>);
var toPMIDLink = value => (
	<a href={`http://www.ncbi.nlm.nih.gov/pubmed/?term=${value.toString()}`}>
		{value}
	</a>);

var jsonLink = link => link.replace(/(.gz)?$/, '.json');
var toDownloadLink = value => (
	<span>
		<a href={value}>{value}</a>
		{'; '}
		<a href={jsonLink(value)}>Full metadata</a>
	</span>);
var toHTML = value => <span dangerouslySetInnerHTML={{__html: value}}/>;

var headerValue = value => value && <p className={styles.header}>{value}</p>;
var htmlValue = value => value &&
	<p className={styles.header} dangerouslySetInnerHTML={{__html: value}}/>;

// XXX Does not display load warning in pop-up
// XXX Does not use red/blue coloring for error vs. other load status (e.g. 'loading')
var getStatus = (status, loaderWarning) =>
	status === 'loaded' && !loaderWarning ? [] :
	status === 'loaded' ? dataPair('status', 'loaded with warning') :
	dataPair('status', status);

// split, handling falsey values
var split = (str, pat) => str ? str.split(pat) : [];

var resolveCodes = (probes, codes, data) =>
	mmap(probes, data, (probe, row) =>
			codes[probe] ? map(row, v => isNaN(v) ? v : codes[probe][v]) :
			row);

// not the most efficient algorithm :-/
var addHeaders = (fields, samples, data) =>
	mmap(['', ...fields], [samples, ...data], (header, row) => [header, ...row]);

var transpose = data => zip.apply(null, data);

// Transpose matrix if it's clinical
var transposeClinical = (meta, data) =>
	get(meta, 'type') === 'clinicalMatrix' ? transpose(data) :
	data;

var table = data => (
		<table className={styles.dataSnippetTable}>
			<tbody>
				{map(data, row => <tr>{map(row, c => <td>{c}</td>)}</tr>)}
			</tbody>
		</table>);

var matrixTable = (meta, {fields, samples, codes, data}) =>
	table(transposeClinical(meta, addHeaders(fields, samples, resolveCodes(fields, codes, data))));

// swap chromend & chromstart when sorting fields
var cmpSparseFields = (a, b) =>
	a === 'chromend' && b === 'chromstart' ? 1 :
	a === 'chromstart' && b === 'chromend' ? -1 :
	a.localeCompare(b);

var sparseTable = (meta, data) => {
	var fields = keys(data).sort(cmpSparseFields),
		rows = fields.map(field => data[field]),
		samples = data.sampleID;
	return table(transpose(addHeaders(fields, samples, rows)));
};

var noTable = () => null;

var dataMethod = ({type = 'genomicMatrix', status} = {}) =>
	status !== 'loaded' ? noTable :
	type === 'genomicMatrix' ? matrixTable :
	type === 'clinicalMatrix' ? matrixTable :
	type === 'mutationVector' ? sparseTable :
	type === 'genomicSegment' ? sparseTable :
	noTable;

var DatasetPage = React.createClass({
	onCohort: navHandler(paramFromHref),
	onViz() {
		var {datapages, spreadsheet: {cohort: currentCohort}} = this.props.state,
			cohort = getIn(datapages, ['dataset', 'meta', 'cohort'], COHORT_NULL);

		if (cohort !== get(currentCohort, 'name')) {
			this.props.callback(['cohort', cohort]);
		}
		this.props.callback(['navigate', 'heatmap']);
	},
	onIdentifiers: navHandler(paramFromHref),
	onSamples: navHandler(paramFromHref),
	render() {
		var {callback, state} = this.props,
			{params: {host, dataset}, datapages} = state,
			{meta, probeCount = 0, data, downloadLink, probemapLink, dataset: currentDataset,
				host: currentHost} = get(datapages, 'dataset', {});

		if (!meta || currentHost !== host || currentDataset !== dataset) {
			return (
				<div className={styles.datapages}>
					<h2>dataset: ...</h2>
				</div>);
		}
		var {name, label = name, description, longTitle,
			cohort = COHORT_NULL, dataSubType, platform, unit,
			assembly, version, url, articletitle, citation, pmid,
			dataproducer, author = dataproducer,
			'wrangling_procedure': wranglingProcedure,
			type = TYPE_NULL, status, loader, count} = meta;

		return (
			<div className={styles.datapages}>
				<div className={styles.sidebar}>
					<Button onClick={this.onViz} accent>Visualize</Button>
					{canDelete(meta, host) ?
						<DeleteButton callback={callback} name={name} label={label}/> : null}
				</div>
				<h2>dataset: {(dataSubType ? dataSubType + ' - ' : '') + label}</h2>
				{headerValue(longTitle)}
				{htmlValue(description)}
				{flatten([
					dataPair('cohort', cohort, toCohortLink(this.onCohort)),
					dataPair('dataset ID', name),
					getStatus(status, loader),
					dataPair('download', downloadLink, toDownloadLink),
					dataPair('samples', count),
					dataPair('version', version),
					dataPair('hub', host),
					dataPair('type of data', dataSubType),
					dataPair('assembly', assembly),
					dataPair('unit', unit),
					dataPair('platform', platform),
					dataPair('ID/Gene Mapping', probemapLink, toDownloadLink),
					dataPair('publication', articletitle),
					dataPair('citation', citation),
					dataPair('author', author),
					dataPair('PMID', pmid, toPMIDLink),
					flatmap(uniq(split(url, /,/)), url =>
						dataPair('raw data', url, toLink)),
					dataPair('wrangling', wranglingProcedure, toHTML),
					dataPair('input data format', FORMAT_MAPPING[type])])}
				{status === 'loaded' ?
					<span className={styles.tableControls}>
						{type === 'genomicMatrix' ?
							`${probeCount.toLocaleString()} identifiers X ${count} samples` : null}
						{type === 'clinicalMatrix' ?
							`${count} samples X ${probeCount.toLocaleString()} identifiers` : null}
						<Link
							href={'?' + encodeObject({host, dataset, allIdentifiers: true})}
							onClick={this.onIdentifiers} label='All Identifiers'/>
						<Link
							href={'?' + encodeObject({host, dataset, allSamples: true})}
							onClick={this.onSamples} label='All Samples'/>
					</span> : null}
				{dataMethod(meta)(meta, data)}
			</div>);
	}
});

// Our handling of parameters 'hub' and 'host', is somewhat confusing. 'host'
// means "show the hub page for this url". 'hub' means "add this url to the
// active hub list, and, if in /datapages/ show the hub page for this url".
// The 'hub' parameter can be repeated, which adds each hub to the active hub
// list. Only the first one will be displayed when linking to /datapages/.
// Needs refactor.
var defaultHost = params =>
	Let(({host, hubs} = params) =>
			!host && hubs ? {...params, host: hubs[0]} : params);

//
// Hub page
//

var HubPage = React.createClass({
	onCohort: navHandler(paramFromHref),
	render() {
		var {state} = this.props,
			{host} = defaultHost(state.params),
			cohorts = getIn(state, ['datapages', 'cohorts'], []),
			hubCohorts = where(cohorts, {server: host}),
			coll = collateCohorts(hubCohorts),
			inHubs = contains(getUserServers(state.spreadsheet.servers), host) ?
				'' : ' (not in my data hubs)';
		return (
			<div className={styles.datapages}>
				{markdownValue(getIn(hubCohorts, [0, 'meta']))}
				<h2>{getHubName(host)}{inHubs}</h2>
				<p>Host address: {host}</p>
				<CohortSummary cohorts={coll} onCohort={this.onCohort}/>
			</div>);
	}
});

//
// Samples / Identifiers page
//


var binSize = 1000;
// The point of ListPage is to render a potentially very long list
// incrementally, so we get a fast first render, and don't lock up the UI.
// We do that by rendering binSize rows at a time, on a requestAnimationFrame
// timeout.
var ListPage = React.createClass({
	mixins: [rxEventsMixin],
	componentWillMount: function () {
		var {state, path} = this.props,
			list = getIn(state, ['datapages', path, 'list']);
		this.events('list');
		var chunks = this.ev.list
			.startWith(list)
			.distinctUntilChanged()
			.filter(identity)
			.switchMap(ids => {
				var chunks = partitionN(ids, binSize).map(a => a.join('\n'));
				return from(range(chunks.length), animationFrame)
					.map(i => ({chunks: chunks.slice(0, i + 1), total: chunks.length}));
			});

		this.sub = chunks.subscribe(chunks => {
			this.setState(chunks);
		});
	},
	componentWillUnmount() {
		this.sub.unsubscribe();
	},
	componentWillReceiveProps(props) {
		var {state, path} = props,
			list = getIn(state, ['datapages', path, 'list']);

		this.on.list(list);
	},
	getInitialState() {
		return {};
	},
	render() {
		var {state, path, title} = this.props,
			{params: {host, dataset}, datapages} = state,
			{dataset: currentDataset, host: currentHost}
				= getIn(datapages, [path], {}),
			{chunks, total} = currentHost !== host || currentDataset !== dataset ?
				{} : this.state,
			percent = !chunks ? ' 0%' :
				chunks.length === total ? '' :
				` ${Math.floor(chunks.length / total * 100)}%`;

		return (
			<div className={styles.datapages}>
				<h3>dataset: {dataset}</h3>
				<h4>{title}{percent}</h4>
				{chunks ? chunks.map(c => (
					<pre className={styles.list}>
						{c}
					</pre>
				)) : 'Loading...'}
			</div>);
	}
});

var IdentifiersPage = props =>
	<ListPage title='Identifiers' path='identifiers' {...props}/>;

var SamplesPage = props =>
	<ListPage title='Samples' path='samples' {...props}/>;

//
// Top-level dispatch to sub-pages
//

var getPage = ({dataset, host, cohort, allIdentifiers, allSamples}) =>
	allSamples ? SamplesPage :
	allIdentifiers ? IdentifiersPage :
	dataset && host ? DatasetPage :
	host ? HubPage :
	cohort ? CohortPage :
	CohortSummaryPage;

var Datapages = React.createClass({
	componentDidMount: function () {
		nav({activeLink: 'datapages', onNavigate: this.onNavigate});
	},
	onNavigate(page) {
		this.props.callback(['navigate', page]);
	},
	render() {
		var {state: {params}} = this.props, // XXX
			Page = getPage(defaultHost(params));

		return <Page {...this.props} />;
	}
});

var ThemedDatapages = React.createClass({
	render() {
		return (
		<ThemeProvider theme={appTheme}>
			<Datapages {...this.props}/>
		</ThemeProvider>);
	}
});

var selector = state => state;

module.exports = props => <ThemedDatapages {...props} selector={selector}/>;
