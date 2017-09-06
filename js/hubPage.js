'use strict';

require('./base');
var controller = require('./controllers/hub');
var React = require('react');
var connector = require('./connector');
var createStore = require('./store');
import {ThemeProvider} from 'react-css-themr';
import '../css/index.css'; // Root styles file (reset, fonts, globals)
var appTheme = require('./appTheme');
var classNames = require('classnames');

import {Button} from 'react-toolbox/lib/button';
// Can't get this styled in a usable way.
//import Input from 'react-toolbox/lib/input';
var typStyles = require('../css/typography.module.css');

var {Grid, Row, Col} = require("react-material-responsive-grid");
var {testHost} = require('./xenaQuery');
var _s = require('underscore.string');
var _ = require('./underscore_ext');
var {serverNames} = require('./defaultServers');
var styles = require('./hubPage.module.css');
var {parseServer} = require('./hubParams');

var RETURN = 13;

var getName = h => _.get(serverNames, h, h);

var getStatus = (user, ping) =>
	user ? (ping === true ? 'connected' : 'selected') : '';

var getStyle = statusStr =>
	statusStr === 'connected' ? styles.connected : null;

var reqStatus = (ping) =>
	ping == null ? ' (connecting...)' :
				(ping ? '' : ' (not running)');

var checkHost = host => testHost(host).take(1).map(v => ({[host]: v}));

var Hub = React.createClass({
	getInitialState() {
		return {
			ping: {}
		};
	},
	componentDidMount() {
		// XXX Use a connector to get rid of selector, here.
		// Or use a sub-component.
		var {state, selector} = this.props,
			allHosts = _.keys(selector(state));

		allHosts.forEach(h => checkHost(h).subscribe(this.updatePing));
	},
	componentWillUnmount() {
		this.sub.dispose();
	},
	componentWillReceiveProps(newProps) {
		var {ping} = this.state,
			{state, selector} = newProps,
			servers = selector(state),
			old = _.omit(ping, _.keys(servers));

		this.setState({ping: _.omit(ping, old)});

		_.difference(_.keys(servers), _.keys(ping))
			.forEach(h => checkHost(h).subscribe(this.updatePing));
	},
	updatePing(h) {
		this.setState({ping: {...this.state.ping, ...h}});
	},
	onKeyDown(ev) {
		if (ev.keyCode === RETURN) {
			ev.preventDefault();
			this.onAdd();
		}
	},
	onSelect(ev) {
		var {checked} = ev.target,
			host = ev.target.getAttribute('data-host');
		this.props.callback([checked ? 'enable-host' : 'disable-host', host, 'user']);
	},
	onAdd() {
		var target = this.refs.newHost,
			value = _s.trim(target.value);
		if (value !== '') {
			this.props.callback(['add-host', parseServer(value)]);
			target.value = '';
		}
	},
	onRemove(ev) {
		var host = ev.currentTarget.getAttribute('data-host');
		this.props.callback(['remove-host', host]);
	},
	render() {
		var {state, selector} = this.props,
			{ping} = this.state,
			servers = selector(state),
			hostList = _.mapObject(servers, (s, h) => ({
				selected: s.user,
				host: h,
				name: getName(h),
				statusStr: getStatus(s.user, ping[h]),
				reqStatus: reqStatus(ping[h])
			}));
		return (
			<Grid>
				<Row>
					<Col mdOffset={2} md={8} xs4={4}>
						<h1 className={typStyles.mdHeadline}>Data Hubs</h1>
					</Col>
				</Row>
				<Row>
					<Col mdOffset={2} md={8} xs4={4}>
						{_.values(hostList).map(h => (
							<Row className={styles.hostForm}>
								<Col md={2}>
									<input onChange={this.onSelect} checked={h.selected} type='checkbox' data-host={h.host}/>
									<span className={classNames(styles.status, getStyle(h.statusStr))}>{h.statusStr}</span>
								</Col>
								<Col md={4}>
									<a href={`../datapages/?host=${h.host}`}>
										{h.name}{h.reqStatus}
									</a>
									<Button icon='close' data-host={h.host} className={styles.remove} onClick={this.onRemove}/>
								</Col>
							</Row>
							))}
							<input className={styles.input} onKeyDown={this.onKeyDown} ref='newHost' type='text'/>
							<Button onClick={this.onAdd}>Add</Button>
					</Col>
				</Row>
			</Grid>);
	}
});

var ThemedHub = React.createClass({
	render() {
		return (
		<ThemeProvider theme={appTheme}>
			<Hub {...this.props}/>
		</ThemeProvider>);
	}
});


var store = createStore();
var main = window.document.getElementById('main');

var selector = state => state.servers;

connector({...store, controller, main, selector, Page: ThemedHub, persist: true, history: false});
