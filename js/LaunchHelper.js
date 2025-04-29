
import React from 'react';
import {
	Box,
	Button,
	ButtonBase,
	Dialog,
	DialogActions,
	DialogContent, Icon,
	IconButton,
	Link,
	Typography
} from '@material-ui/core';
import PureComponent from './PureComponent';
import { map, pick, mapObject, getIn, get } from './underscore_ext.js';
var platform = require('platform');
var Rx = require('./rx').default;

// Styles
import styles from './LaunchHelper.module.css';
var sxHelperContent = {
	color: '#757575',
	display: 'grid',
	gridTemplateRows: '1fr 1fr auto',
	height: '100%',
	textAlign: 'center'
};

var osFiles = {
		osxJre: {
			pattern: "ucsc_xena_macos_[_0-9]*_with_jre.dmg",
			description: "OSX installer, bundled JRE",
			help: "Recommended for OSX 10.7 and above"
		},
		win32: {
			pattern: "ucsc_xena_windows_[_0-9]*.exe",
			description: "Windows 32 bit installer, bundled JRE",
			help: "Recommended for all 32 bit versions of Windows"
		},
		win64: {
			pattern: "ucsc_xena_windows-x64_[_0-9]*.exe",
			description: "Windows 64 bit installer, bundled JRE",
			help: "Recommended for all 64 bit versions of Windows"
		},
		tar: {
			pattern: "ucsc_xena_[_0-9]*.tar.gz",
			description: "Tar archive, no updater or JRE",
			help: "Recommended for linux server deployments"
		}
	}, defaults = {
		'OS X': {64: 'osxJre'},
		'Windows': {32: 'win32', 64: 'win64'},
		'Linux': {32: 'tar', 64: 'tar'}
	};

function findMatch(pattern, list) {
	var matches = list.filter(s => s.match(pattern));
	return matches.length > 0 ? matches[0] : undefined;
}

var matchPaths = serverFiles =>
	mapObject(osFiles, (obj, key) =>
			  findMatch(osFiles[key].pattern, serverFiles));

var parseInt10 = s => parseInt(s, 10);

function osxArch() {
	var version = getIn(platform, ['os', 'version']),
		parts = version && version.match(/(\d*)\.(\d*)/).slice(1).map(parseInt10); // [maj, min, patch]
	return (parts && parts[0] === 10 && parts[1] <= 6) ? 32 : 64;
}

function getOs() {
	var family = getIn(platform, ['os', 'family']);
	if (family) {
		if (family.indexOf('Windows') !== -1) {
			return 'Windows';
		}
		if (family.indexOf('OS X') !== -1) {
			return 'OS X';
		}
		if (family.indexOf('Linux') !== -1) {
			return 'Linux';
		}
	}
}

var downloadDir = 'https://genome-cancer.ucsc.edu/download/public/get-xena';
var i4jLogo = `${downloadDir}/install4j_small.png`;
var updatesPath = `${downloadDir}/updates.xml`;
var downloadPath = name => `${downloadDir}/${name}`;
var getFileName = e => downloadPath(e.getAttribute('fileName'));

class XenaDownload extends React.Component {
	state = {};

	componentDidMount() {
		// Haven't been able to get the browsers to use the etags from
		// the server. It might need some other header to indicate that
		// the doc should be considered expired. This doesn't help in
		// the current deployment, because the headers for the doc have already
		// been served. A tacky work-around is to append a random query string,
		// forcing the client to bypass its cache.
		// Note that the etags do appear to work for some files, like the
		// image files.
		this.sub = Rx.Observable.ajax({method: 'GET', responseType: 'document', url: updatesPath + '?x=' + Math.random().toString(), crossDomain: true}).subscribe(xml => {
			var files = matchPaths([...xml.response.getElementsByTagName('entry')]
								   .map(getFileName));

			this.setState({files}); //eslint-disable-line react/no-did-mount-set-state
		});
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	onShowAdvanced = () => {
		this.props.onShowAdvanced(!this.props.advanced);
	}

	render() {
		var {files} = this.state,
			{isFirst, advanced} = this.props,
			os = getOs(),
			arch = os === 'OS X' ? osxArch() : getIn(platform, ['os', 'architecture']),
			defaultTarget = getIn(defaults, [os, arch]),
			defaultInstall = get(files, defaultTarget);

		return (
			<div>
				<Typography className={styles.i4j} component='div' variant='body1'>Supported by <a href='https://www.ej-technologies.com/products/install4j/overview.html'><img alt='i4j' src={i4jLogo}/></a></Typography>
				<Typography component='div' variant='h2'>
					{isFirst ? 'If this is your first time, ' : 'If nothing prompts from browser, '}
					{defaultInstall ?
						<Link display='block' href={defaultInstall} underline='always'>download & run a Local Xena hub.</Link> :
						'download & run a Local Xena hub, from the list below:'}
				</Typography>
				{defaultInstall ? <ButtonBase disableRipple onClick={this.onShowAdvanced}>{advanced ? 'Fewer options...' : 'More options...'}</ButtonBase> : null}
				<div className={advanced || !defaultInstall ? styles.tableShow : styles.table}>{map(files ? pick(osFiles, (_, k) => files[k]) : [], (info, key) =>
					<Link key={key} className={styles.downloadList} display='block' href={files[key]} title={info.help} underline='hover'>{info.description}</Link>)}</div>
			</div>);
	}
}

var launchingHelp = ['Launching...',
	<Typography variant='body1'>Please click <b>Open UCSC xena</b> if you see the system dialog.</Typography>];

var statusHelp = {
	undefined: [],
	down: launchingHelp,
	started: launchingHelp,
	up: ['Your local Xena Hub is running.',
		<Typography variant='body1'>To view your data, use the "Visualization" button</Typography>],
	old: ['Your local Xena Hub is out of date.',
		<p></p>],
	lost: ['We have lost contact with your Local Xena hub.',
		<Typography variant='body1'>To re-start it, you may reload this page.</Typography>]
};

var launch = () => {
	var i = document.getElementById('xenaLauncher');
	if (i) {
		document.body.removeChild(i);
	}
	i = document.createElement('iframe');
	i.id = 'xenaLauncher';
	document.body.appendChild(i);
	i.src = 'ucscxena://';
};

// XXX Note that we re-render on every change of the wrapped
// component. Maybe should put dialog in a separate component to
// avoid re-rendering it.
var wrap = Comp => (class extends PureComponent {
	static displayName = 'LaunchHelperWrapper';

	constructor(props) {
		super(props);
		// If we just arrived on a page that requires the hub, and status is
		// 'down' but not 'lost' (i.e. user shutdown), try to start.
		this.state = {advanced: false, show: props.state.localStatus === 'down' || props.state.localStatus === 'old'};
	}

	componentDidMount() {
		if (this.props.state.localStatus === 'down') {
			launch();
		}
	}

	UNSAFE_componentWillReceiveProps(props) {//eslint-disable-line camelcase
		// If localStatus was not set (no ping yet, from server) and changes to 'down',
		// show dialog & try to launch.
		if (!this.props.state.localStatus && props.state.localStatus === 'down') {
			this.setState({show: true});
			launch();
		} else if (props.state.localStatus === 'up') {
			this.setState({show: false});
		}
	}

	onShowAdvanced = advanced => {
		this.setState({advanced});
	}

	onHide = () => {
		this.setState({show: false});
	}

	onShow = () => {
		this.setState({show: true});
	}

	setCompRef = ref => {
		this.compRef = ref;
	}

	render() {
		var {advanced, show} = this.state,
			{localStatus: status} = this.props.state,
			statusBadge =
				status === 'up' ? (
					<Box component={IconButton} sx={{left: -4, position: 'relative', top: -4}}
						 title='Connected to local Xena Hub' onClick={this.onShow}>
						<Box component={Icon} color='#77FFCC'>lens</Box></Box>) : (
					<Box component={IconButton} sx={{left: -4, position: 'relative', top: -4}}
						 title='Not connected to local Xena Hub. Click for details.' onClick={this.onShow}>
						<Icon color='error'>lens</Icon></Box>),
			unsupported = platform.name.match(/safari/i) && status === 'down',
			[header, help] = unsupported ? [
				`${platform.name} does not support viewing your own data. Please use Chrome or Firefox`,
				<p></p>
			] : statusHelp[status];

		return (
			<Comp ref={this.setCompRef} {...this.props} badge={statusBadge}>
				<Dialog
					fullWidth
					maxWidth='xl'
					onClose={this.onHide}
					open={show}
					PaperProps={{style: {height: '100%'}}}>
					<DialogContent>
						<Box sx={sxHelperContent}>
							<Box component='h2' sx={{alignSelf: 'center'}}>{header}</Box>
							<div>
								{help}
								{status !== 'up' && status !== 'lost' ? <XenaDownload isFirst={status !== 'old'} advanced={advanced} onShowAdvanced={this.onShowAdvanced}/> : null}
							</div>
							<Typography variant='body1'>A Local Xena Hub is an application on your computer for loading and storing data.</Typography>
						</Box>
					</DialogContent>
					<DialogActions>
						<Button color='default' disableElevation href='https://ucsc-xena.gitbook.io/project/local-xena-hub' target='_blank' variant='contained'>Help</Button>
						<Button color='default' disableElevation onClick={this.onHide} variant='contained'>Close</Button>
					</DialogActions>
				</Dialog>
			</Comp>);
	}
});

var wrapLaunchHelper = (shouldMount, Comp) => {
	var Wrapper = wrap(Comp),
		LaunchHelperMounter = props => shouldMount(props) ? <Wrapper {...props}/> : <Comp {...props}/>;
	return LaunchHelperMounter;
};

export default wrapLaunchHelper;
