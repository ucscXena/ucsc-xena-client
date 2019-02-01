'use strict';

require('./base');
var React = require('react');
var Rx = require('./rx');
import {ThemeProvider} from 'react-css-themr';
import '../css/index.css'; // Root styles file (reset, fonts, globals)
var appTheme = require('./appTheme');
var classNames = require('classnames');

import {Button} from 'react-toolbox/lib/button';
import {Card} from 'react-toolbox/lib/card';
import {Checkbox} from 'react-toolbox/lib/checkbox';
var typStyles = require('../css/typography.module.css');

var {testHost} = require('./xenaQuery');
var _ = require('./underscore_ext');
var {servers: {localHub}, serverNames} = require('./defaultServers');
var styles = require('./hubPage.module.css');
var {parseServer, getHubParams} = require('./hubParams');
var nav = require('./nav');
var {encodeObject} = require('./util');

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

var Hub = class extends React.Component {
	static displayName = 'Hub';

	state = {
		ping: {}
	};

	onNavigate = (page, params) => {
		this.props.callback(['navigate', page, params]);
	};

	componentDidMount() {
		// XXX Use a connector to get rid of selector, here.
		// Or use a sub-component.
		var {state, selector} = this.props,
			allHosts = _.keys(selector(state));

		nav({activeLink: 'hub', onNavigate: this.onNavigate});
		this.ping = new Rx.Subject();

		this.sub = this.ping.switchMapTo(Rx.Observable.from(allHosts.map(checkHost)).mergeAll())
			.subscribe(this.updatePing);

		this.ping.next();
	}

	onStartup = () => {
		this.ping.next();
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	componentWillReceiveProps(newProps) {
		var {ping} = this.state,
			{state, selector} = newProps,
			servers = selector(state),
			old = _.omit(ping, _.keys(servers));

		this.setState({ping: _.omit(ping, old)});

		_.difference(_.keys(servers), _.keys(ping))
			.forEach(h => checkHost(h).subscribe(this.updatePing));
	}

	updatePing = (h) => {
		this.setState({ping: {...this.state.ping, ...h}});
	};

	onKeyDown = (ev) => {
		if (ev.keyCode === RETURN) {
			ev.preventDefault();
			this.onAdd();
		}
	};

	onSelect = (isOn, ev) => {
		var {checked} = ev.target,
			host = ev.target.getAttribute('data-host');
		this.props.callback([checked ? 'enable-host' : 'disable-host', host, 'user']);
	};

	onAdd = () => {
		var target = this.refs.newHost,
			value = target.value.trim();
		if (value !== '') {
			this.props.callback(['add-host', parseServer(value)]);
			target.value = '';
		}
	};

	onRemove = (ev) => {
		var host = ev.currentTarget.getAttribute('data-host');
		this.props.callback(['remove-host', host]);
	};

	render() {
		var {state, selector, badge} = this.props,
			hubParams = getHubParams(state),
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
			<div className={styles.hubPage}>
				<h1 className={typStyles.mdHeadline}>Data Hubs</h1>
				<Card>
					<ul className={styles.hubList}>
						{_.values(hostList).map(h => (
						<li key={h.host}>
							<Checkbox className={styles.checkbox} onChange={this.onSelect} checked={h.selected}
									  data-host={h.host}/>
							<div className={styles.statusContainer}>
								<span className={classNames(styles.status, getStyle(h.statusStr))}>{h.statusStr}</span>
							</div>
							<div className={styles.hubNameContainer}>
								<a href={`../datapages/?${encodeObject({host: h.host, ...hubParams})}`}>
									{h.name}
								</a>
								{h.host === localHub ? badge : h.reqStatus}
							</div>
							<i className={classNames('material-icons', styles.remove)} data-host={h.host}
							   onClick={this.onRemove}>close</i>
						</li>
						))}
						<li>
							<div className={styles.hostForm}>
								<input className={styles.input} onKeyDown={this.onKeyDown} ref='newHost'
									   type='text' placeholder='Add Hub'/>
								<Button onClick={this.onAdd} accent>Add</Button>
							</div>
						</li>
					</ul>
				</Card>
			</div>);
	}
};

var selector = state => state.spreadsheet.servers;

class ThemedHub extends React.Component {
	render() {
		return (
		<ThemeProvider theme={appTheme}>
			<Hub {...this.props} selector={selector}/>
		</ThemeProvider>);
	}
}

module.exports = ThemedHub;
