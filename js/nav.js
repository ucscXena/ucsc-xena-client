/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Navigation component.
 */

// Core dependencies, components
import {
	AppBar,
	Button,
	Box,
	Link,
	Menu,
	MenuItem,
	MuiThemeProvider,
	createTheme,
	Icon
} from '@material-ui/core';
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('./underscore_ext').default;
var {servers: {localHub}} = require('./defaultServers');
import * as store from './hiddenOpts';
import Rx from './rx';
var meta = require('./meta');
var BookmarkMenu = require('./views/BookmarkMenu');
import {GENESETS_VIEWER_URL} from './views/GeneSetViewDialog';
import {xenaColor} from './xenaColor';
import xenaTheme from './xenaTheme';

// Styles
var sxNav = {
	alignItems: 'stretch',
	color: xenaColor.ACCENT,
	columnGap: 32,
	display: 'flex',
	justifyContent: 'flex-start'
};
var sxNavLink = {
	alignItems: 'center',
	cursor: 'pointer',
	display: 'flex',
	textTransform: 'uppercase',
	whiteSpace: 'nowrap',
};
var sxXenaBar = {
	alignItems: 'center',
	borderBottom: `1px solid ${xenaColor.BLACK_12}`,
	columnGap: 80,
	display: 'flex',
	flex: 1,
	minHeight: 64,
	padding: '0 24px',
};

// Images
import logoSantaCruzImg from '../images/logoSantaCruz.png';
import logoSantaCruz2xImg from '../images/logoSantaCruz@2x.png';
import logoSantaCruz3xImg from '../images/logoSantaCruz@3x.png';

// Locals
var links = [
	{label: 'Data Sets', nav: 'datapages'},
	{label: 'Visualization', nav: 'heatmap'},
	{label: 'Transcripts', nav: 'transcripts'},
	{label: 'Data Hubs', nav: 'hub'},
	{label: 'View My Data', nav: 'datapages', params: {addHub: localHub, host: localHub}},
];

var helproot = 'https://ucsc-xena.gitbook.io/project/';

var helpLink = {
	href: helproot,
	label: 'Help',
	target: '_blank'
};

var geneSetsLink = {
    href: GENESETS_VIEWER_URL,
    label: 'Gene Sets',
    target: '_blank'
};

var pythonLink = {
    href: helproot + 'overview-of-features/accessing-data-through-python',
    label: 'Python',
    target: '_blank'
};

var publicationLink = {
	href: 'https://ucscxena.github.io',
	label: 'Publication Page',
	target: '_blank'
};

var active = (l, activeLink) => l.nav === activeLink;

class MoreToolsMenu extends React.Component {
	state = {
		anchorEl: null,
	};

	onClick = event => {
		this.setState({ anchorEl: event.currentTarget });
	};

	handleClose = () => {
		this.setState({ anchorEl: null });
	};

	handleSelect = (url) => {
		window.open(url);
		this.handleClose();
	};

	render() {
		let {anchorEl} = this.state;

		return (
			<>
				<Button color='secondary' onClick={this.onClick}>More Tools</Button>
				<Menu
					anchorEl={anchorEl}
					anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
					getContentAnchorEl={null}
					onClose={this.handleClose}
					open={Boolean(anchorEl)}
				>
					<MenuItem onClick={this.handleSelect.bind(this, publicationLink.href)}>
						{publicationLink.label}
					</MenuItem>
					<MenuItem onClick={this.handleSelect.bind(this, pythonLink.href)}>
						{pythonLink.label}
					</MenuItem>
					<MenuItem onClick={this.handleSelect.bind(this, geneSetsLink.href)}>
						{geneSetsLink.label}
					</MenuItem>
				 </Menu>
			</>
		);
	}
}

var hiddenOptsSub;
var hiddenOpts;
if (module.hot && module.hot.data) {
	hiddenOptsSub = module.hot.data.hiddenOptsSub;
	hiddenOpts = module.hot.data.hiddenOpts;
} else {
	hiddenOptsSub = new Rx.Subject();
	hiddenOpts = hiddenOptsSub.scan((acc, f) => f(acc), {}).shareReplay(1);
}

if (module.hot) {
	module.hot.dispose(data => {
		_.extend(data, {hiddenOptsSub, hiddenOpts});
	});
}

// XXX can we use connect instead?
hiddenOpts.subscribe(() => {}); // stupid rx hack for laziness

// caller API
// var initVal = hidden.create(key, label, {onChange, localStorage, default})
// hidden.create(key, label, {onClick})
// hidden.delete(key);

export var hidden = {
	create: (key, label, opts) => {
		if (opts.onChange) {
			opts = {...opts, value: store.get(key, opts.default, opts.local)};
		}
		hiddenOptsSub.next(ho => _.assoc(ho, key, {label, ...opts}));
		return opts.value;
	},
	delete: key => {
		hiddenOptsSub.next(ho => _.dissoc(ho, key));
	},
	update: key => {
		hiddenOptsSub.next(ho => {
			var v = !ho[key].value;
			ho[key].onChange(v);              // XXX side effect
			store.set(key, v, ho[key].local); // XXX side effect
			return _.assocIn(ho, [key, 'value'], v);
		});
	}
};

class XenaNav extends React.Component {
	state = {
		options: {},
		showHiddenMenu: false,
	}
	componentDidMount() {
		this.sub = hiddenOpts.subscribe(options => {
			this.setState({options});
		});
		hidden.create('noga', 'Disable analytics', {
			onChange: () => { setTimeout(() => location.reload(), 100); },
			default: false,
			local: true
		});
	}
	componentWillUnmount() {
		hidden.delete('noga');
		this.sub.unsubscribe();
	}

	// have to early-bind id because MenuItem
	// events are broken in prod.
	onToggle = id => () => {
		hidden.update(id);
	}

	onCloseHiddenMenu = () => {
		this.setState({showHiddenMenu: false});
	}

	forceClose = cb =>
		(...args) => {
			this.onCloseHiddenMenu();
			return cb(...args);
		}

	hiddenMenu(items) {
		return (
			<Menu
				anchorReference='anchorPosition'
				anchorPosition={{left: 16, top: 16}}
				onClose={this.onCloseHiddenMenu}
				open={this.state.showHiddenMenu}
			>
				{_.map(items, ({label, onClick, onChange, value}, key) =>
					onChange ?
						<MenuItem key={key} onClick={this.forceClose(this.onToggle(key))}>
							<Icon color='secondary'>{value ? 'done' : 'none'}</Icon>
							{label}
						</MenuItem> :
						<MenuItem key={key} onClick={this.forceClose(onClick)}>{label}</MenuItem>)}
			</Menu>);
	}

	onClick = ev => {
		if (ev.shiftKey && ev[meta.key]) {
			ev.preventDefault();
			this.setState({showHiddenMenu: true});
		}
	}
	render() {
		var {isPublic, activeLink, getState, onImport} = this.props;
		var routes = _.map(links, l => {
			var {nav, params, ...others} = l,
			onClick = nav ? () => this.props.onNavigate(nav, params) : undefined;
			return {...others, onClick, active: active(l, activeLink)};
		});
		var logoSrcSet = `${logoSantaCruz2xImg} 2x, ${logoSantaCruz3xImg} 3x`;
		var NavLink = ({active, ...props}) => {
			return <Link color='secondary' style={{color: active ? xenaColor.PRIMARY_CONTRAST : undefined}} variant='body1' {...props}/>;
		};
		return (
			<AppBar color='default' position='relative'>
				<Box sx={sxXenaBar}>
					<Box component={'a'} onClick={this.onClick} href='http://xena.ucsc.edu/' sx={{lineHeight: 0}}>
						<Box
							component={'img'}
							alt='Xena Logo'
							title={window.ga ? '' : 'no analytics'}
							src={logoSantaCruzImg}
							srcSet={logoSrcSet}
							sx={{maxWidth: 139}}/>
					</Box>
					{this.hiddenMenu(this.state.options)}
					<Box component='nav' sx={sxNav}>
						{routes.map(({label, ...routeProps}) =>
							<Box component={NavLink} key={label} sx={sxNavLink} {...routeProps}>{label}</Box>)}
						{getState ? <BookmarkMenu isPublic={isPublic} getState={getState} onImport={onImport}/> : null}
						<Box component={NavLink} href={helpLink.href} sx={sxNavLink} target={helpLink.target}>Help</Box>
						<MoreToolsMenu/>
					</Box>
				</Box>
			</AppBar>
		);
	}
}

class ThemedNav extends React.Component {
	render() {
		const navTheme = createTheme({
			...xenaTheme,
			overrides: {
				...xenaTheme.overrides,
				MuiButton: {
					root: {
						...xenaTheme.overrides.MuiButton.root,
						...xenaTheme.typography.body1,
						fontWeight: 500,
						height: 36,
					},
					text: {
						padding: '0 12px'
					},
				},
				MuiDivider: {
					root: {
						...xenaTheme.overrides.MuiDivider.root,
						margin: '12px 0',
					},
				},
			},
		});
		return (
			<MuiThemeProvider theme={navTheme}>
				<XenaNav {...this.props}/>
			</MuiThemeProvider>
		);
	}
}

var nav = document.getElementById('navMenuMain');

var comp;

var render = props => comp = ReactDOM.render(<ThemedNav {...props} />, nav);

export var addMenuItem = item => {
	comp.setState(state => ({items: state.items.append([item])}));
};

export var removeItem = item => {
	comp.setState(state => ({items: state.items.append([item])}));
};


export default render;
