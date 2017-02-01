'use strict';

require('./base');
var controller = require('./controllers/hub');
var React = require('react');
var connector = require('./connector');
var createStore = require('./store');
var Input = require('react-bootstrap/lib/Input');
var FormGroup = require('react-bootstrap/lib/FormGroup');
var PageHeader = require('react-bootstrap/lib/PageHeader');
var Button = require('react-bootstrap/lib/Button');
var Grid = require('react-bootstrap/lib/Grid');
var Row = require('react-bootstrap/lib/Row');
var Col = require('react-bootstrap/lib/Col');
var Label = require('react-bootstrap/lib/Label');
var Glyphicon = require('react-bootstrap/lib/Glyphicon');
var {testHost} = require('./xenaQuery');
var _s = require('underscore.string');
var _ = require('./underscore_ext');
var {serverNames} = require('./defaultServers');
require('./hub.css');
var {parseServer} = require('./hubParams');

var RETURN = 13;

var getName = h => _.get(serverNames, h, h);

var getStatus = (user, ping) =>
	user ? (ping === true ? 'connected' : 'selected') : '';

var getStyle = statusStr =>
	statusStr === 'connected' ? 'info' : 'default';

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
		var target = this.refs.newHost.refs.input,
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
					<Col md={10}>
						<PageHeader>Data Hubs</PageHeader>
						{_.values(hostList).map(h => (
							<form key={h.host} className="host-form form-horizontal"><FormGroup>
								<input className='col-md-1' onChange={this.onSelect} checked={h.selected} type='checkbox' data-host={h.host}/>
								<span className='col-md-2'>
								<Label bsStyle={getStyle(h.statusStr)}>{h.statusStr}</Label>
								</span>
								<span className='col-md-4'>
									<a href={`../datapages/?host=${h.host}`}>
										{h.name}{h.reqStatus}
									</a>
								</span>
								<Button className='remove' bsSize='xsmall' data-host={h.host} onClick={this.onRemove}>
									<Glyphicon glyph='remove' />
								</Button>
							</FormGroup></form>
							))}
						<form className="form-horizontal">
						<FormGroup>
							<Input onKeyDown={this.onKeyDown} ref='newHost' standalone type='text' wrapperClassName='col-md-6'/>
							<Button onClick={this.onAdd} wrapperClassName='col-md-2'>Add</Button>
						</FormGroup>
						</form>
					</Col>
				</Row>
			</Grid>);
	}
});

var store = createStore(true);
var main = window.document.getElementById('main');

var selector = state => state.servers;

connector({...store, controller, main, selector, Page: Hub, persist: true, history: false});
