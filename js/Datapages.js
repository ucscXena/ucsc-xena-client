require('./base');
import {
	Box,
	Button,
	Card,
	Checkbox,
	createTheme,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Link,
	MuiThemeProvider,
	Typography
} from '@material-ui/core';
const React = require('react');
var {uniq, flatten, sortBy, groupBy, map, flatmap, partitionN, mapObject,
	contains, get, updateIn, range, Let, pick,
	zip, identity, getIn, sum, keys, values, mmap} = require('./underscore_ext').default;
var {Observable: {from}, Scheduler: {animationFrame}} = require('./rx').default;
var {parseDsID} = require('./xenaQuery');
var styles = require('./Datapages.module.css');
import nav from './nav';
var showdown = require('showdown');
var {stripHTML} = require('./dom_helper');
import treehouseImg from '../images/Treehouse.jpg';
var {rxEvents} = require('./react-utils');
var {servers: {localHub}, serverNames} = require('./defaultServers');
import {defaultHost} from './urlParams';
var {encodeObject, urlParams} = require('./util').default;
var {getHubParams} = require('./hubParams');
import PureComponent from './PureComponent';
import wrapLaunchHelper from './LaunchHelper';
import {xenaTheme} from './xenaTheme';
import xss from './xss';
import spinner from './ajax-loader.gif';

var getHubName = host => get(serverNames, host, host);

var isLocalHub = host => host === localHub;

var pluralize = (str, count) => count === 1 ? `1 ${str}` : `${count} ${str}s`;

// Get params from the anchor href.
var paramFromHref = ev => mapObject(urlParams(ev.target.href), a => a[0]);

//
// event handler for navigating within datapages. Prevents page load, and
// sets url params.
//

function navHandler(ev) {
	ev.preventDefault();
	this.props.callback(['navigate', 'datapages', paramFromHref(ev, this.props.state)]);
}

var getUserServers = servers => keys(servers).filter(k => servers[k].user);

//
// Data hubs sidebar
//

var hubLink = (host, onClick, hubParams) => (
	<Link
		href={'?' + encodeObject({host, ...hubParams})}
		onClick={onClick}
		underline='hover'>{getHubName(host)}</Link>);

class DataHubs extends React.Component {
	onHub = (ev) => { navHandler.call(this, ev); };

	onSelect = (ev) => {
		var {checked} = ev.target,
			host = ev.target.getAttribute('data-host');
		this.props.callback([checked ? 'enable-host' : 'disable-host', host, 'user']);
	};

	render() {
		var {hubParams, state: {spreadsheet: {servers}}} = this.props;
		return (
			<div>
				<h2>Active Data Hubs</h2>
				<ul>
					{map(servers,
						({user}, host) => (
							<li key={host}>
								<FormControlLabel
									control={<Checkbox checked={user || false} inputProps={{'data-host': host}} onChange={this.onSelect}/>}
									label={hubLink(host, this.onHub, hubParams)}/>
							</li>))}
				</ul>
			</div>);
	}
}


//
// Cohort Summary Page
//

var treehouse = cohort =>
	cohort.search(/^Treehouse/gi) === -1 ? null :
	<img src={treehouseImg} height='40px'/>;

var cohortLink = (cohort, onClick, hubParams) => (
	<Link href={'?' + encodeObject({cohort, ...hubParams})} onClick={onClick} underline='hover'>{cohort}</Link>);

var collateCohorts = hubCohorts =>
	flatten(values(hubCohorts)).reduce(
		(acc, cohort) => cohort.cohort ?
			updateIn(acc, [cohort.cohort], (v = 0) => cohort.count + v) : acc,
		{});

var CohortSummary = ({cohorts, onCohort, hubParams, action}) => {
	var names = sortBy(keys(cohorts), c => c.toLowerCase()),
		nCohorts = names.length,
		nDatasets = sum(values(cohorts));
	return (
		<div>
			<h2>{pluralize('Cohort', nCohorts)}, {pluralize('Dataset', nDatasets)} {action}</h2>
			<ul className={styles.list}>
				{map(names, name =>
					<Typography component='li' key={name} variant='subtitle2'>
						{treehouse(name)}
						{cohortLink(name, onCohort, hubParams)}
						{` (${pluralize('dataset', cohorts[name])})`}
					</Typography>)}
			</ul>
		</div>);
};

var CohortHeader = ({inHubs, host, onImport, badge}) => {
	let localHubUp = getIn(badge, ['props', 'title']) === "Connected to local Xena Hub";

	return(
		<div>
			<h2 className={styles.inline}>{getHubName(host)}{inHubs}{badge}</h2>

			{isLocalHub(host) &&
			<div className={styles.headerButtons}>
				{localHubUp ? <Button onClick={onImport}>Load Data</Button> : null }
				<Button href='https://ucsc-xena.gitbook.io/project/local-xena-hub' target="_blank">Help</Button>
			</div>}

			{isLocalHub(host) ? null : <p>Hub address: {host}</p>}

			{isLocalHub(host) && <div className={styles.descriptionBox}>
				<p>A Local Xena Hub is an application on your computer for loading and storing data.</p>

				<p>We support most types of genomic and/or phenotypic/clinical/annotation data.
					This data can be your own or from another source, such as a publication.</p>

				<p>Data on a Local Xena Hub can only be viewed or accessed by the same computer on which it is running.</p>
			</div>}
		</div>
	);
};

class CohortSummaryPage extends React.Component {
	onCohort = (ev) => { navHandler.call(this, ev); };

	render() {
		var {hubParams, state} = this.props,
			{spreadsheet: {servers}} = state,
			userServers = getUserServers(servers),
			cohorts = getIn(this.props.state, ['datapages', 'cohorts'], {}),
			activeCohorts = pick(cohorts, userServers),
			combined = collateCohorts(activeCohorts);
		return (
			<DatapagesContainer>
				<Box sx={{display: 'grid', gridTemplateColumns: '1fr auto'}}>
					<CohortSummary hubParams={hubParams} cohorts={combined} onCohort={this.onCohort}/>
					<DataHubs {...this.props}/>
				</Box>
			</DatapagesContainer>);
	}
}

//
// Dataset delete button
//

class DeleteButton extends React.Component {
	state = {open: false};

	onDelete = () => {
		this.setState({open: !this.state.open});
	};

	onReally = () => {
		var {name} = this.props;
		this.setState({open: false});
		this.props.callback(['delete-dataset', localHub, name]);
	};

	render() {
		var {open} = this.state,
			{label} = this.props;
		return (
			<>
				<Dialog maxWidth={false} onClose={this.onDelete} open={open}>
					<DialogTitle disableTypography><h2>Delete dataset</h2></DialogTitle>
					<DialogContent>
						{label}
					</DialogContent>
					<DialogActions>
						<Button onClick={this.onDelete}>Cancel</Button>
						<Button onClick={this.onReally}>Really Delete</Button>
					</DialogActions>
				</Dialog>
				<Button onClick={this.onDelete}>Delete</Button>
			</>);
	}
}

var canDelete = ({status}, host) =>
	host === localHub && contains(['loaded', 'error'], status);

var markdownValue = (value) => {
	if (value) {
		var converter = new showdown.Converter();
		return (<div className={styles.header}
			dangerouslySetInnerHTML={{__html: xss(converter.makeHtml(value))}}/>);
	}
};

//
// Cohort Datasets Page
//

var datasetLink = (callback, preferred, onClick, hubParams) => ds => {
	var [host] = parseDsID(ds.dsID);
	return (
		<li key={ds.name}>
			<Link
				href={'?' + encodeObject({dataset: ds.name, host, ...hubParams})}
				onClick={onClick}
				underline='hover'>{ds.label}</Link>
			{preferred.has(ds.dsID) ? <span className={styles.star}>*</span> : null}
			{ds.status !== 'loaded' ?
				<span className={styles.count}> [{ds.status}]</span> : null}
			{ds.status === 'loaded' ?
				<span className={styles.count}> (n={(ds.count || 0).toLocaleString()})</span> :
				null}
			<span> {getHubName(host)}</span>
			{canDelete(ds, host) ?
				<Box component='span' ml={3}><DeleteButton callback={callback} name={ds.name} label={ds.label || ds.name}/></Box> : null}
			<div className={styles.lineClamp}>
				<span className={styles.description}>{stripHTML(ds.description)}</span>
			</div>
		</li>);
};

var drawGroup = (callback, groups, preferred, onClick, hubParams) => dataSubType => {
	var list = sortBy(groups[dataSubType], g => g.label.toLowerCase());
	return (
		<div key={dataSubType}>
			<h3>{dataSubType}</h3>
			<ul className={styles.groupList}>
				{map(list, datasetLink(callback, preferred, onClick, hubParams))}
			</ul>
		</div>);
};

var COHORT_NULL = '(unassigned)';

var getPreferred = (wizard, cohort) =>
	new Set(values(getIn(wizard, ['cohortPreferred', cohort], {})));

class CohortPage extends React.Component {
	onViz = () => {
		var {params, spreadsheet: {cohort: currentCohort}} = this.props.state,
			cohort = params.cohort;

		if (cohort !== get(currentCohort, 'name')) {
			this.props.callback(['cohort', cohort]);
		}
		this.props.callback(['navigate', 'heatmap']);
	};

	clickVizButton = (ev) => {
		if (ev.target.className === 'cohortButton') {
			ev.target.dataset.bookmark ?
			window.open(`${document.location.origin}/?bookmark=${ev.target.dataset.bookmark}`, "_self") :
			this.onViz();
		}
	};


	onDataset = (ev) => { navHandler.call(this, ev); };

	render() {
		var {hubParams, callback,
				state: {datapages, spreadsheet, params: {cohort}, wizard}} = this.props,
			servers = getUserServers(spreadsheet.servers),
			meta = getIn(datapages, ['cohort', cohort]),
			datasetsByHost = pick(
					getIn(datapages, ['cohortDatasets', cohort], {}), servers),
			datasets = flatten(values(datasetsByHost)),
			dsGroups = groupBy(values(datasets), 'dataSubType'),
			dataSubTypes = sortBy(keys(dsGroups), g => g.toLowerCase()),
			preferred = getPreferred(wizard, cohort);

		return (
			<DatapagesContainer onClick={this.clickVizButton}>
				{markdownValue(meta)}
				<div className={styles.sidebar}>
					<Button onClick={this.onViz}>Visualize</Button>
				</div>
				<h2>cohort: {treehouse(cohort)}{cohort}</h2>
				{dataSubTypes.map(drawGroup(callback, dsGroups, preferred, this.onDataset, hubParams))}
				{preferred.size === 0 ? null : (
					<span>
						<span className={styles.star}>*</span>
						<span>default dataset in visualization</span>
					</span>)}
			</DatapagesContainer>);
	}
}

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
var toCohortLink = (onClick, hubParams) => cohort => (
	<Link href={'?' + encodeObject({cohort, ...hubParams})} onClick={onClick} underline='hover'>{cohort}</Link>);
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
var toHTML = value => <span dangerouslySetInnerHTML={{__html: xss(value)}}/>;

var headerValue = value => value && <p className={styles.header}>{value}</p>;
var htmlValue = value => value &&
	<p className={styles.header} dangerouslySetInnerHTML={{__html: xss(value)}}/>;

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
			map(row, codes[probe] ? v => isNaN(v) ? 'null' : codes[probe][v] :
				v => isNaN(v) ? 'null' : v.toPrecision(4)));

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
				{map(data, (row, i) => <tr key={i}>{map(row, (c, j) => <td key={j}>{c}</td>)}</tr>)}
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

var setKey = arr => arr.map((el, i) => React.cloneElement(el, {key: i}));

var getProbeCount = (datapages, host, dataset) => {
	var pc = getIn(datapages, ['datasetProbeCount', host, dataset]);
	return pc == null ? <img src={spinner}/> : pc.toLocaleString();
};

var DatapagesContainer = ({children, ...props}) => {
	return (
		<div className={styles.datapages} {...props}>
			<Card elevation={2}>
				<Box sx={{padding: '20px 40px 40px'}}>
					{children}
				</Box>
			</Card>
		</div>
	);
};

var DatasetPage = wrapLaunchHelper(
	props => getIn(props, ['state', 'params', 'host']) === localHub,
	class extends PureComponent {
		static displayName = 'DatasetPage'
		onCohort = (ev) => { navHandler.call(this, ev); };

		onViz = () => {
			var {params: {host, dataset},
					datapages, spreadsheet: {cohort: currentCohort}} = this.props.state,
				cohort = getIn(datapages, ['dataset', host, dataset, 'meta', 'cohort'], COHORT_NULL);

			if (getIn(this.props.state, ['spreadsheet', 'servers', host, 'user']) !== true) {
				this.props.callback(['add-host', host]);
			}
			if (cohort !== get(currentCohort, 'name')) {
				this.props.callback(['cohort', cohort]);
			}
			this.props.callback(['navigate', 'heatmap']);
		};

		onIdentifiers = (ev) => { navHandler.call(this, ev); };
		onSamples = (ev) => { navHandler.call(this, ev); };

		render() {
			var {callback, state, hubParams, children, badge} = this.props,
				{params: {host, dataset}, datapages} = state,
				{meta, data, downloadLink, probemapLink} = getIn(datapages, ['dataset', host, dataset], {}),
				probeCount = getProbeCount(datapages, host, dataset),
				githubDescripton = getIn(datapages, ['datasetDescription', dataset], null);

			if (!meta) {
				return (
					<DatapagesContainer>
						{children /* LaunchHelper */}
						<h2>dataset: {dataset}...<img src={spinner}/></h2>
						<h3>hub: {host}{badge}</h3>
					</DatapagesContainer>);
			}
			var {name, label = name, description, longTitle,
				cohort = COHORT_NULL, dataSubType, platform, unit,
				assembly, version, url, articletitle, citation, pmid,
				dataproducer, author = dataproducer,
				'wrangling_procedure': wranglingProcedure,
				type = TYPE_NULL, status, loader, count} = meta;

			return (
				<DatapagesContainer>
					{children /* LaunchHelper */}
					<div className={styles.sidebar}>
						<Button onClick={this.onViz}>Visualize</Button>
						{canDelete(meta, host) ?
							<DeleteButton callback={callback} name={name} label={label}/> : null}
					</div>
					<h2>dataset: {(dataSubType ? dataSubType + ' - ' : '') + label}</h2>
					<h3>hub: {host}{badge}</h3>
					{headerValue(longTitle)}
					{markdownValue(githubDescripton) || htmlValue(description)}
					{setKey(flatten([
						dataPair('cohort', cohort, toCohortLink(this.onCohort, hubParams)),
						dataPair('dataset ID', name),
						getStatus(status, loader),
						dataPair('download', downloadLink, toDownloadLink),
						dataPair('samples', count),
						dataPair('version', version),
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
						dataPair('input data format', FORMAT_MAPPING[type])]))}
					{status === 'loaded' ?
						<span className={styles.tableControls}>
							{type === 'genomicMatrix' ? probeCount : null}
							{type === 'genomicMatrix' ?
								` identifiers X ${count} samples ` : null}
							{type === 'clinicalMatrix' ?
								`${count} samples X ${probeCount} identifiers ` : null}
							<Link
								href={'?' + encodeObject({host, dataset, allIdentifiers: true, ...hubParams})}
								onClick={this.onIdentifiers} underline='hover'>All Identifiers</Link>
							<Link
								href={'?' + encodeObject({host, dataset, allSamples: true, ...hubParams})}
								onClick={this.onSamples} underline='hover'>All Samples</Link>
						</span> : null}
					{dataMethod(meta)(meta, data)}
				</DatapagesContainer>);
		}
});

//
// Hub page
//

var HubPage = wrapLaunchHelper(
	props => defaultHost(props.state.params).host === localHub,
	class extends PureComponent {
		onCohort = (ev) => {navHandler.call(this, ev);};

		onImport = () => {
			this.props.callback(['reset-import-state']);
			this.props.callback(['navigate', 'import']);
		}

		onViz = (cohort) => {
			if (!cohort) {return;}

			var {spreadsheet: {cohort: currentCohort}} = this.props.state;

			if (cohort !== get(currentCohort, 'name')) {
				this.props.callback(['cohort', cohort]);
			}
			this.props.callback(['navigate', 'heatmap']);
		};

		clickVizButton = (ev) => {
			if (ev.target.className === 'hubButton') {
				this.onViz(ev.target.dataset.cohort);
			}
		};

		render() {
			var {state, hubParams, badge, children} = this.props,
				{spreadsheet: {servers}} = state,
				userServers = getUserServers(servers),
				{host} = defaultHost(state.params),
				hubCohorts = getIn(state, ['datapages', 'cohorts', host], []),
				coll = collateCohorts(hubCohorts),
				inHubs = contains(userServers, host) ?
					'' : ' (not in my data hubs)';

			if (!contains(userServers, host)) {
				this.props.callback(['add-host', host]);
			}

			return (
				<DatapagesContainer onClick={this.clickVizButton}>
					{children /* LaunchHelper */}
					{markdownValue(getIn(state, ['datapages', 'hubMeta', host]))}
					<CohortHeader inHubs={inHubs} host={host} onImport={this.onImport} badge={badge}/>
					<CohortSummary
						hubParams={hubParams}
						cohorts={coll}
						onCohort={this.onCohort}/>
				</DatapagesContainer>);
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
class ListPage extends React.Component {
	state = {};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'list');
		var chunks = events.list
			.startWith(this.props.list)
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
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	UNSAFE_componentWillReceiveProps(props) {//eslint-disable-line camelcase
		this.on.list(props.list);
	}

	render() {
		var {dataset, title} = this.props,
			{chunks, total} = this.state,
			percent = !chunks ? ' 0%' :
				chunks.length === total ? '' :
				` ${Math.floor(chunks.length / total * 100)}%`;

		return (
			<DatapagesContainer>
				<h3>dataset: {dataset}</h3>
				<h4>{title}{percent}</h4>
				{chunks ? chunks.map((c, i) => (
					<pre key={i} className={styles.list}>
						{c}
					</pre>
				)) : 'Loading...'}
			</DatapagesContainer>);
	}
}

class markdownPage extends React.Component {
	render() {
		var {state} = this.props,
			content = getIn(state, ['datapages', 'markdown', state.params.markdown]);

		return (
			<DatapagesContainer>
				{markdownValue(content)}
			</DatapagesContainer>);
	}
}

var IdentifiersPage = props =>
	Let(({state: {params: {host, dataset}}} = props) =>
		(<ListPage title='Identifiers'
			dataset={dataset}
			list={getIn(props.state, ['datapages', 'identifiers', host, dataset])}/>));

var SamplesPage = props =>
	Let(({state: {params: {host, dataset}}} = props) =>
		(<ListPage title='Samples'
			dataset={dataset}
			list={getIn(props.state, ['datapages', 'samples', host, dataset])}/>));

//
// Top-level dispatch to sub-pages
//

var getPage = ({dataset, host, cohort, allIdentifiers, allSamples, markdown}) =>
	markdown ? markdownPage :
	allSamples ? SamplesPage :
	allIdentifiers ? IdentifiersPage :
	dataset && host ? DatasetPage :
	host ? HubPage :
	cohort ? CohortPage :
	CohortSummaryPage;

class Datapages extends React.Component {
	componentDidMount() {
		nav({activeLink: 'datapages', onNavigate: this.onNavigate});
	}

	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	render() {
		var {state} = this.props, // XXX
			{params} = state,
			hubParams = getHubParams(state),
			Page = getPage(defaultHost(params));

		return <Page {...this.props} hubParams={hubParams} />;
	}
}

class ThemedDatapages extends React.Component {
	render() {
		const pageTheme = createTheme(xenaTheme, {
			overrides: {
				MuiLink: {
					root: {
						color: '#337ab7',
						'&:hover': {
							color: '#23527c',
						}
					},
				},
			},
		});
		return (
			<MuiThemeProvider theme={pageTheme}>
				<Datapages {...this.props}/>
			</MuiThemeProvider>
		);
	}
}

var selector = state => state;

export default props => <ThemedDatapages {...props} selector={selector}/>;
