/*eslint-env browser */
/*global require: false, console: false */

'use strict';

require('base');
var React = require('react');
var L = require('./lenses/lens');
var Ls = require('./lenses/lenses');
var Spreadsheet = require('./spreadsheet');
var AppControls = require('./AppControls');
var reactState = require('./reactState');
var statePropsStream = require('./react-utils').statePropsStream;
var xenaQuery = require('./xenaQuery');
var Input = require('react-bootstrap/lib/Input');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Rx = require('./rx.ext');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');
var meta = require('./meta');
require('./plotDenseMatrix'); // XXX better place or name for this?


var d = window.document;
var main = d.getElementById('main');
var defaultServers = ['https://genome-cancer.ucsc.edu:443/proj/public/xena',
		'https://local.xena.ucsc.edu:7223'];
var initialState = {
		servers: {'default': defaultServers, user: defaultServers},
		zoom: {height: 300},
		// XXX rename state as columnOrder and columns, instead of columnRendering
		columnRendering: {},
		columnOrder: []
	};

require('bootstrap/dist/css/bootstrap.css');
require('rx-dom');

function fetchDatasets(stream) {
	return stream.map(([, props]) => props).refine(['servers', 'cohort'])
		.map(state => state.cohort ?
				xenaQuery.dataset_list(state.servers.user, state.cohort) :
				Rx.Observable.return([], Rx.Scheduler.timeout)
		).switchLatest().map(servers => ({ // index by dsID
			servers: servers,
			datasets: _.object(_.flatmap(servers,
						s => _.map(s.datasets, d => [d.dsID, d])))
		}));
}

var datasetSamples = xenaQuery.dsID_fn(xenaQuery.dataset_samples);

function fetchSamples(stream) {
	return stream.map(([, props]) => props)
		.refine(['servers', 'cohort', 'samplesFrom'])
		.map(state => state.samplesFrom ?
				datasetSamples(state.samplesFrom) :
				Rx.Observable.zipArray(
					_.map(state.servers.user, s => xenaQuery.all_samples(s, state.cohort))
				).map(_.apply(_.union)))
		.switchLatest();
}

function formatState(lens) {
	return JSON.stringify(L.view(lens), null, 4);
}

// Given state and props, return data which needs to be fetched for the columns.
// Memoized so we don't re-compute this on every state change. Each widgets.fetch
// is also memoized, for the same reason.
function dataRequestFn() {
	var fetchFns = _.memoize1(dataTypes => _.fmap(dataTypes, dt => widgets.fetch(dt)));
	return (state, props) => {
		var dataTypes = _.fmap(props.columnRendering, col => col.dataType);
		var ffns = fetchFns(dataTypes);
		return _.fmap(ffns, (f, k) => f(props.columnRendering[k], state.samples));
	};
}

function fetchData(stream) {
	return stream.select(r =>    // find each unique query.
		// This is taking per-column requests of form
		// {colId : {dataKey: {id: queryId, query: queryFn}, ...}, ...}
		// and returning the unique queries, as
		// {queryId: queryFn, ...}
		_.reduce(r, (acc, colReqs) => {
			_.each(colReqs, req => { acc[req.id] = req.query; });
			return acc;
		}, {})
	).fmap();                    // invoke queries w/caching
}

function cmpString(s1, s2) {
	if (s1 > s2) {
		return 1;
	} else if (s2 > s1) {
		return -1;
	}
	return 0;
}

// Caching sort function. Might be a waste of effort. Need performance tests.
// The concern is that quickly-changing state in a widget will cause endless
// re-sorting. So, this only sorts when the previous sort is invalidated.
// Maybe instead use a sort that is O(N) on pre-sorted data.
//
// Each widget may need to change the sort, e.g. when an 'averaging' or
// 'normalization' setting is changed, when the widget type changes, or when
// new data arrives for the widget.
//
// The sort is invalidated when 1) the set of samples changes, 2)
// the order of widgets changes, 3) the type of widgets changes, 4)
// the widget returns a new cmp function due to its internal settings,
// 5) the data used by the widget changes. Note that we don't know which
// internal settings or data affect the sort. That's up to the widget.
// widget.cmp will return a memoize1 cmp function that accounts for
// changes in internal settings and data that affect the sort.
//
// Steps:
// 1) get cmp function generators for each widget, if widget type has changed.
// 2) get cmp functions from each generator based on columnRendering, data.
// 3) get a new sort fn if widget cmp functions or order have changed.
// 4) compute a new sort if sort function or samples have changed.

var sampleSortFn = () => {
	var mkCmpFns = _.memoize1(dataTypes => _.fmap(dataTypes, dt => widgets.cmp(dt)));
	var cmpFns = (mcf, cR, data) => _.fmap(mcf, (fn, id) => fn(cR[id], data[id]));
	var sortFn = _.memoize1((cmpFns, order) => (s1, s2) =>
			_.findValue(order, id => cmpFns[id](s1, s2)) ||
				cmpString(s1, s2)); // XXX add cohort as well
	var sort = _.memoize1((fn, samples) => samples.slice(0).sort(fn));

	return ({columnRendering, columnOrder}, samples, data) => {
		var dataTypes = _.fmap(columnRendering, r => r.dataType),
			cfs = cmpFns(mkCmpFns(dataTypes), columnRendering, data),
			sf = sortFn(cfs, columnOrder);
		return sort(sf, samples);
	};
};

// XXX Switch back to propsStream, as we aren't using state.
var Application = React.createClass(statePropsStream({
	displayName: 'Application',
	saveAppState: function () {
		sessionStorage.xena = JSON.stringify(L.view(this.props.lens));
	},
	componentWillMount: function () {
		fetchDatasets(this.statePropsStream).subscribe(
				datasets => this.setState({datasets: datasets}));
		fetchSamples(this.statePropsStream).subscribe(
				samples => {
					this.setState({samples: samples});
					// XXX This is wrong. Should only do this when user-driven.
					L.over(this.props.lens, s => _.assoc(s, 'zoom',
							_.assoc(s.zoom,
								'count', samples.length,
								'index', 0)));
				});
		this.requestStream = new Rx.Subject();
		fetchData(this.requestStream).subscribe(
				data => this.setState({data: data}));

		Rx.DOM.fromEvent(window, 'beforeunload').subscribe(this.saveAppState);
		this.sortSamples = sampleSortFn();
		this.dataRequests = dataRequestFn();
	},
	getInitialState() {
		return {
			samples: [],
			debug: false,
			debugText: formatState(this.props.lens) // initial state of text area.
		};
	},
	componentWillReceiveProps () {
		this.setState({debugText: formatState(this.props.lens)});
	},
	handleChange: function (ev) {
		this.setState({debugText: ev.target.value});
	},
	onClick: function (ev) {
		if (ev[meta.key]) {
			this.setState({'debug': !this.state.debug});
		}
	},
	onKeyDown: function (ev) {
		if (ev.key === 'Enter' && ev.ctrlKey) {
			try {
				L.set(this.props.lens, null, JSON.parse(this.state.debugText));
			} catch (e) {
				if (console) {
					console.log(e);
				}
			}
			ev.preventDefault();
		}
	},
	render: function() {
		var {datasets, samples, data} = this.state,
			spreadsheetLens = L.compose(this.props.lens, Ls.keys(['zoom', 'columnRendering', 'columnOrder', 'vizSettings']));

		var requests = this.dataRequests(this.state, L.view(this.props.lens));
		this.requestStream.onNext(requests);
		// XXX memoize this, as well?
		var columnData = _.fmap(requests,
				(colReqs) => _.fmap(colReqs, req => _.getIn(data, [req.id]) || {}));


		var sort = this.sortSamples(L.view(this.props.lens), samples, columnData);
		return (
			<Grid onClick={this.onClick}>
				<Row>
					<Col md={12}>
						<AppControls lens={this.props.lens} datasets={datasets}/>
					</Col>
				</Row>
				<Spreadsheet
					lens={spreadsheetLens}
					datasets={datasets}
					data={columnData}
					samples={sort} />
				<Row>
					<Col md={12}>
						<Input
							type='textarea'
							id='debug'
							rows='20'
							cols='130'
							style={{display: _.getIn(this.state, ['debug']) ? 'block' : 'none'}}
							onChange={this.handleChange}
							onKeyDown={this.onKeyDown}
							value={this.state.debugText} />
					</Col>
				</Row>
				<div className='chartRoot' style={{display: 'none'}} />
			</Grid>
		);
	}
}));

// XXX put session save down here, too?
var lens = reactState(Application, main);
if (sessionStorage && sessionStorage.xena) {
	initialState = _.extend(initialState, JSON.parse(sessionStorage.xena));
}
L.set(lens, null, initialState);
