/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Navigation component.
 *
 * This is a light wrapper component around React Toolbox's AppBar component.
 */


import {GENESETS_VIEWER_URL} from "./views/GeneSetViewDialog";

// Core dependencies, components
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('./underscore_ext').default;
import AppBar from 'react-toolbox/lib/app_bar';
import Navigation from 'react-toolbox/lib/navigation';
import {ThemeProvider} from 'react-css-themr';
import Link from 'react-toolbox/lib/link';
import {Menu, MenuItem} from 'react-toolbox/lib/menu';
import {Button} from 'react-toolbox/lib/button';
var navTheme = require('./navTheme');
var BookmarkMenu = require('./views/BookmarkMenu');
var {servers: {localHub}} = require('./defaultServers');
import * as store from './hiddenOpts';
import Rx from './rx';
var meta = require('./meta');

// Styles
var compStyles = require('./nav.module.css');

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
	};

	render() {
		let {anchorEl} = this.state;

		return (
				<div style={{display: "inline", position: 'relative'}}>
					<Button
						onClick={this.onClick}>
						More Tools
					</Button>
					<Menu position='topLeft'
						active={Boolean(anchorEl)}
						onHide={this.handleClose}
						className={compStyles.menu}
					>
						<MenuItem onClick={this.handleSelect.bind(this, publicationLink.href)} caption={publicationLink.label}/>
						<MenuItem onClick={this.handleSelect.bind(this, pythonLink.href)} caption={pythonLink.label}/>
						<MenuItem onClick={this.handleSelect.bind(this, geneSetsLink.href)} caption={geneSetsLink.label}/>
					 </Menu>
				</div>
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
		options: {}
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

	setMenuRef = ref => {
		this.menuRef = ref;
	}

	// RT MenuItem identity check fails in dev, leaving the
	// menu open after selection. Force it closed here.
	forceClose = cb => process.env.NODE_ENV === 'production' ? cb :
		(...args) => {
			this.menuRef.hide();
			return cb(...args);
		}

	hiddenMenu(items) {
		return (
			<Menu innerRef={this.setMenuRef} theme={{menu: compStyles.menu}} position='topLeft'>
				{_.map(items, ({label, onClick, onChange, value}, key) =>
					onChange ? <MenuItem key={key}
						className={value ? compStyles.selected : ''}
						onClick={this.forceClose(this.onToggle(key))} caption={label}/> :
					<MenuItem key={key} onClick={this.forceClose(onClick)} caption={label}/>)}
			</Menu>);
	}

	onClick = ev => {
		if (ev.shiftKey && ev[meta.key]) {
			ev.preventDefault();
			this.menuRef.show();
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
		return (
			<AppBar className={compStyles.NavAppBar}>
				<a onClick={this.onClick} href='http://xena.ucsc.edu/' className={compStyles.logoXena}><img title={window.ga ? '' : 'no analytics'} src={logoSantaCruzImg} srcSet={logoSrcSet}/></a>
				{this.hiddenMenu(this.state.options)}
				<Navigation type="horizontal" routes={routes}>
					{getState ? <BookmarkMenu isPublic={isPublic} getState={getState} onImport={onImport}/> : null}
					<Link {...helpLink} />
					<MoreToolsMenu/>
				</Navigation>
			</AppBar>
		);
	}
}

class ThemedNav extends React.Component {
	render() {
		return (
			<ThemeProvider theme={navTheme}>
				<XenaNav {...this.props}/>
			</ThemeProvider>);
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
