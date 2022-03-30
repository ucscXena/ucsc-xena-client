
require('./base');
import {
	Box,
	Button,
	Card,
	Checkbox,
	Icon,
	IconButton,
	Input,
	Link,
	List,
	ListItem,
	Typography
} from '@material-ui/core';
var React = require('react');
var Rx = require('./rx').default;

var {testHost} = require('./xenaQuery');
var _ = require('./underscore_ext').default;
var {servers: {localHub}, serverNames} = require('./defaultServers');
var {parseServer, getHubParams} = require('./hubParams');
import nav from './nav';
import XTypography, {XTypographyVariants} from './views/XTypography';
import {xenaColor} from './xenaColor';
var {encodeObject} = require('./util').default;

// Styles
var styles = require('./hubPage.module.css');
var sxHubItem = {
	gap: 16,
	'&:hover': {
		backgroundColor: xenaColor.BLACK_3
	},
};
var sxStatusContainer = {
	borderRadius: 24,
	minWidth: 100,
};

var RETURN = 13;

var getName = h => _.get(serverNames, h, h);

var getStatus = (user, ping) =>
	user ? (ping === true ? 'connected' : 'selected') : '';

var isStatusConnected = statusStr => statusStr === 'connected';

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

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
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

	onSelect = (ev) => {
		var {checked} = ev.target,
			host = ev.target.getAttribute('data-host');
		this.props.callback([checked ? 'enable-host' : 'disable-host', host, 'user']);
	};

	onAdd = () => {
		var target = this.newHost,
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

	setAddHubInputRef = ref => this.newHost = ref;

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
				<XTypography component='h1' variant={XTypographyVariants.MD_HEADLINE}>Data Hubs</XTypography>
				<Card elevation={2}>
					<List disablePadding>
						{_.values(hostList).map(h => (
						<Box component={ListItem} divider key={h.host} sx={sxHubItem}>
							<Checkbox checked={h.selected || false} inputProps={{'data-host': h.host}} onChange={this.onSelect}/>
							<Box
								bgcolor={isStatusConnected(h.statusStr) ? 'secondary.main' : xenaColor.BLACK_6}
								color={isStatusConnected(h.statusStr) ? 'primary.contrastText' : undefined}
								component='span'
								sx={sxStatusContainer}>
								<Typography align='center' className={styles.status} display='block' variant='caption'>{h.statusStr}</Typography>
							</Box>
							<Box flex={1}>
								<Link href={`../datapages/?${encodeObject({
									host: h.host,
									addHub: hubParams.addHub,
									removeHub: hubParams.removeHub.filter( hub => hub !== h.host)})}`} variant='body1'>
									{h.name}
								</Link>
								<Typography display='inline' variant='body1'>{h.host === localHub ? badge : h.reqStatus}</Typography>
							</Box>
							<IconButton data-host={h.host} edge='end' onClick={this.onRemove}>
								<Icon className={styles.remove}>close</Icon>
							</IconButton>
						</Box>
						))}
						<Box component={ListItem} sx={{gap: 16}}>
							<Box sx={{marginLeft: 150, width: 400}}>
								<Input fullWidth inputRef={this.setAddHubInputRef} onKeyDown={this.onKeyDown} placeholder='Add Hub' type='text'/>
							</Box>
							<Button onClick={this.onAdd}>Add</Button>
						</Box>
					</List>
				</Card>
			</div>);
	}
};

var selector = state => state.spreadsheet.servers;

class HubPage extends React.Component {
	render() {
		return (
			<Hub {...this.props} selector={selector}/>
		);
	}
}

export default HubPage;
