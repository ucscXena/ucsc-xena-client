/*jslint browser: true */
/*global require: false, console: false */

'use strict';

require('base');
var React = require('react');
var L = require('./lenses/lens');
var Ls = require('./lenses/lenses');
var Spreadsheet = require('./spreadsheet');
var AppControls = require('./AppControls');
var reactState = require('./reactState');
var propsStream = require('./react-utils').propsStream;
var xenaQuery = require('./xenaQuery');
var Input = require('react-bootstrap/lib/Input');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Rx = require('./rx.ext');
var _ = require('./underscore_ext');
var d = window.document;
var main = d.getElementById('main');
var defaultServers = ['https://genome-cancer.ucsc.edu:443/proj/public/xena',
		'https://local.xena.ucsc.edu:7223'];
var initialState = {
		servers: {'default': defaultServers, user: defaultServers},
		columnRendering: {},
		columnOrder: []
	};

require('bootstrap/dist/css/bootstrap.css');
require('rx-dom');

function fetchDatasets(stream) {
	return stream.refine(['servers', 'cohort'])
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
	return stream.refine(['servers', 'cohort', 'samplesFrom'])
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


var Application = React.createClass(propsStream({
	displayName: 'Application',
	saveAppState: function () {
		sessionStorage.xena = JSON.stringify(L.view(this.props.lens));
	},
	componentWillMount: function () {
		fetchDatasets(this.propsStream).subscribe(
				datasets => this.setState({datasets: datasets}));
		fetchSamples(this.propsStream).subscribe(
				samples => this.setState({samples: samples}));
		Rx.DOM.fromEvent(window, 'beforeunload').subscribe(this.saveAppState);
	},
	getInitialState() {
		return {
			debug: false,
			debugText: formatState(this.props.lens) // initial state of text area.
		};
	},
	componentWillReceiveProps (nextProps) {
		this.setState({debugText: formatState(this.props.lens)});
	},
	handleChange: function (ev) {
		this.setState({debugText: ev.target.value});
	},
	onClick: function (ev) {
		if (ev.ctrlKey === true) {
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
		var datasets = _.getIn(this.state, ['datasets']),
			spreadsheetLens = L.compose(this.props.lens, Ls.keys(['zoom', 'columnRendering', 'columnOrder']));
		console.log('state', L.view(this.props.lens));
		console.log('transient state', this.state);
		return (
			<Grid onClick={this.onClick}>
				<Row>
					<Col md={12}>
						<AppControls lens={this.props.lens} datasets={datasets}/>
					</Col>
				</Row>
				<Spreadsheet lens={spreadsheetLens} datasets={datasets} samples={this.state.samples} />
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
							value={this.state.debugText}>
						</Input>
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
