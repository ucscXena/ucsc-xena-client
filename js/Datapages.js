'use strict';

require('./base');
const React = require('react');
var {uniq, flatten, sortBy, groupBy, map, flatmap, partitionN,
	pluck, concat, where, contains, get, updateIn, range,
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

var getHubName = host => get(serverNames, host, host);

//
// Data hubs sidebar
//

var hubLink = (host, onClick) => (
	<Link
		className={styles.link}
		href={`?host=${host}`}
		data-host={host}
		label={getHubName(host)}
		onClick={onClick}/>);

var DataHubs = React.createClass({
	onHub(ev) {
		ev.preventDefault();
		var host = ev.target.parentElement.dataset.host;
		this.props.callback(['navigate', 'datapages', {host}]);
	},
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

var cohortLink = (name, onClick) => (
	<Link
		className={styles.link}
		href={`?cohort=${name}`}
		data-cohort={name}
		label={name}
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
			<h2>{nCohorts} Cohorts, {nDatasets} Datasets</h2>
			<ul className={styles.list}>
				{map(names, name =>
					<li>
						{treehouse(name)}
						{cohortLink(name, onCohort)}
						{` (${cohorts[name]} datasets)`}
					</li>)}
			</ul>
		</div>);
};

var CohortSummaryPage = React.createClass({
	onCohort(ev) {
		ev.preventDefault();
		var cohort = ev.target.parentElement.dataset.cohort;
		this.props.callback(['navigate', 'datapages', {cohort}]);
	},
	render() {
		var {state} = this.props,
			{spreadsheet: {servers}} = state,
			userServers = keys(servers).filter(k => servers[k].user),
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
// Cohort Datasets Page
//

var datasetLink = (preferred, onClick) => ds => {
	var [host] = parseDsID(ds.dsID);
	return (
		<li>
			<Link
				className={styles.link}
				href={`?dataset=${ds.name}&host=${host}`}
				data-host={host}
				data-dataset={ds.name}
				label={ds.label}
				onClick={onClick}/>
			{preferred.has(ds.dsID) ? <span className={styles.star}>*</span> : null}
			<span className={styles.count}> (n={ds.count.toLocaleString()})</span>
			<span> {getHubName(host)}</span>
			<div className={styles.lineClamp}>
				<span className={styles.description}>{stripHTML(ds.description)}</span>
			</div>
		</li>);
};

var drawGroup = (groups, preferred, onClick) => dataSubType => {
	var list = sortBy(groups[dataSubType], g => g.label.toLowerCase());
	return (
		<div>
			<h3>{dataSubType}</h3>
			<ul className={styles.groupList}>
				{map(list, datasetLink(preferred, onClick))}
			</ul>
		</div>);
};

var COHORT_NULL = '(unassigned)';

var getPreferred = (wizard, cohort) =>
	new Set(values(getIn(wizard, ['cohortPreferred', cohort], {})));

var CohortPage = React.createClass({
	onViz() {
		var {datapages} = this.props.state,
			cohort = getIn(datapages, ['cohort', 'cohort'], COHORT_NULL);
		this.props.callback(['cohort', 0, cohort]);
		this.props.callback(['navigate', 'heatmap']);
	},
	onDataset(ev) {
		ev.preventDefault();
		var {host, dataset} = ev.target.parentElement.dataset;
		this.props.callback(['navigate', 'datapages', {host, dataset}]);
	},
	render() {
		var {datapages, params, wizard} = this.props.state,
			cohort = getIn(datapages, ['cohort', 'cohort']) === params.cohort ?
				datapages.cohort : {cohort: '...', datasets: []},
			dsGroups = groupBy(values(cohort.datasets), 'dataSubType'),
			dataSubTypes = sortBy(keys(dsGroups), g => g.toLowerCase()),
			preferred = getPreferred(wizard, params.cohort);

		return (
			<div className={styles.datapages}>
				<div className={styles.sidebar}>
					<Button onClick={this.onViz} accent>Visualize</Button>
				</div>
				<h2>cohort: {treehouse(cohort.cohort)}{cohort.cohort}</h2>
				{dataSubTypes.map(drawGroup(dsGroups, preferred, this.onDataset))}
				{preferred.size === 0 ? null : (
					<span>
						<span className={styles.star}>*</span>
						<span>default dataset in visualization basic mode</span>
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
var toCohortLink = onClick => value => (
	<a
		href={`?cohort=${encodeURIComponent(value)}`}
		onClick={onClick}>
		{value}
	</a>);
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

var dataMethod = ({type = 'genomicMatrix'} = {}) =>
	type === 'genomicMatrix' ? matrixTable :
	type === 'clinicalMatrix' ? matrixTable :
	type === 'mutationVector' ? sparseTable :
	type === 'genomicSegment' ? sparseTable :
	noTable;

var DatasetPage = React.createClass({
	onCohort(ev) {
		ev.preventDefault();
		var cohort = getIn(this.props.state,
			['datapages', 'dataset', 'meta', 'cohort'], COHORT_NULL);
		this.props.callback(['navigate', 'datapages', {cohort}]);
	},
	onViz() {
		var {datapages} = this.props.state,
			cohort = getIn(datapages, ['dataset', 'meta', 'cohort'], COHORT_NULL);
		this.props.callback(['cohort', 0, cohort]);
		this.props.callback(['navigate', 'heatmap']);
	},
	onIdentifiers(ev) {
		var {host, dataset} = this.props.state.params;
		ev.preventDefault();
		this.props.callback(['navigate', 'datapages', {host, dataset, allIdentifiers: true}]);
	},
	onSamples(ev) {
		var {host, dataset} = this.props.state.params;
		ev.preventDefault();
		this.props.callback(['navigate', 'datapages', {host, dataset, allSamples: true}]);
	},
	render() {
		var {state} = this.props,
			{params: {host, dataset}, datapages} = state,
			{meta, data, downloadLink, probemapLink, dataset: currentDataset,
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
				<a
					href={`?host=${host}&dataset=${encodeURIComponent(dataset)}&allIdentifiers=true`}
					onClick={this.onIdentifiers}>All Identifiers</a>
				{' '}
				<a
					href={`?host=${host}&dataset=${encodeURIComponent(dataset)}&allSamples=true`}
					onClick={this.onSamples}>All Samples</a>
				{dataMethod(meta)(meta, data)}
			</div>);
	}
});

//
// Hub page
//

var markdownValue = value => {
	if (value) {
		var converter = new showdown.Converter();
		return (<div className={styles.header}
			dangerouslySetInnerHTML={{__html: converter.makeHtml(value)}}/>);
	}
};

var HubPage = React.createClass({
	onCohort(ev) {
		ev.preventDefault();
		var cohort = ev.target.parentElement.dataset.cohort;
		this.props.callback(['navigate', 'datapages', {cohort}]);
	},
	render() {
		var {state} = this.props,
			{params: {host}} = state,
			cohorts = getIn(state, ['datapages', 'cohorts'], []),
			hubCohorts = where(cohorts, {server: host}),
			coll = collateCohorts(hubCohorts);
		return (
			<div className={styles.datapages}>
				{markdownValue(getIn(hubCohorts, [0, 'meta']))}
				<h2>{getHubName(host)}</h2>
				<p>Host address: {host}</p>
				<CohortSummary cohorts={coll} onCohort={this.onCohort}/>
			</div>);
	}
});

//
// Identifiers page
//

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
				var chunks = partitionN(ids, 1000).map(a => a.join('\n'));
				return from(range(chunks.length), animationFrame)
					.map(i => chunks.slice(0, i + 1));
			});

		this.sub = chunks.subscribe(chunks => {
			this.setState({chunks});
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
			chunks = currentHost !== host || currentDataset !== dataset ?
				undefined : this.state.chunks;

		return (
			<div className={styles.datapages}>
				<h3>dataset: {dataset}</h3>
				<h4>{title}</h4>
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
		var {state: {params}} = this.props,
			Page = getPage(params);

		return <Page {...this.props} />;
	}
});

var selector = state => state;

module.exports = props => <Datapages {...props} selector={selector}/>;
