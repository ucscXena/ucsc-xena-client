'use strict';

import React from 'react';
import Dialog from 'react-toolbox/lib/dialog';
import PureComponent from './PureComponent';
var {map, pick, mapObject, getIn, get} = require('./underscore_ext');
var {servers: {localHub}} = require('./defaultServers');
var platform = require('platform');
var {testStatus} = require('./xenaQuery');
var Rx = require('./rx');
import Link from 'react-toolbox/lib/link';
import styles from './LaunchHelper.module.css';

var osFiles = {
		osxJre: {
			pattern: "ucsc_xena_macos_[_0-9]*_with_jre.dmg",
			description: "OSX installer, bundled JRE",
			help: "Recommended for OSX 10.7 and above"
		},
		osxNoJre: {
			pattern: "ucsc_xena_macos_[_0-9]*.dmg",
			description: "OSX installer, no JRE",
			help: "Recommended for OSX 10.6"
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
		'OS X': {32: 'osxNoJre', 64: 'osxJre'},
		'Windows': {32: 'win32', 64: 'win64'},
		'Linux': {32: 'tar', 64: 'tar'}
	};

function findMatch(pattern, list) {
	var matches = list.filter(s => s.match(pattern));
	return matches.length > 0 ? matches[0] : undefined;
}

var matchPaths = serverFiles =>
	mapObject(osFiles, ({pattern}, key) =>
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
		this.sub = Rx.Observable.ajax({method: 'GET', responseType: 'xml', url: updatesPath, crossDomain: true}).subscribe(xml => {
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
			{advanced} = this.props,
			os = getOs(),
			arch = os === 'OS X' ? osxArch() : getIn(platform, ['os', 'architecture']),
			defaultTarget = getIn(defaults, [os, arch]),
			defaultInstall = get(files, defaultTarget);

		return (
			<div className={styles.download}>
				{defaultInstall ? <Link className={styles.downloadLink} href={defaultInstall} label='Install UCSC Xena hub'/> : null}
				{defaultInstall ? <span className={styles.advancedLink} onClick={this.onShowAdvanced}>Show {advanced ? 'Basic' : 'Advanced'}</span> : null}
				{defaultInstall ? <br/> : null}
				{(defaultInstall || advanced) ? null : 'Please download an installer'}
				{(files && (advanced || !defaultInstall)) ? map(pick(osFiles, (_, k) => files[k]), (info, key) =>
					 <Link className={styles.downloadLink} href={files[key]} title={info.help} label={info.description}/>) : null}
				<br/>
				<img src={i4jLogo}/>
			</div>);
	}
}

var statusHelp = {
	launching: (
		<div>
			<p>Attempting to start the Xena Hub on your computer...</p>
		</div>),
	started: (
		<div>
			<p>The Xena Hub is starting...</p>
		</div>),
	failed: (
		<div>
			<p>We were not able to start the Xena Hub for you. Please open the application from your Applications Folder,
				or download it if you have not previously installed it.</p>
			<p>The Xena Hub needs to be running for you to import or visualize data from your own computer.</p>
		</div>),
	failedStarting: (
		<div>
			<p>The Xena Hub is taking a long time to start. If you have a lot of local data, this is expected.
			It should be ready soon. If it continues to be a problem, please contact us at genome-cancer@soe.ucsc.edu
			</p>
		</div>),
	up: (
		<div>
			<p>Your local Xena Hub is running.</p>
			<p>To view your data, use the "Visualization" button</p>
		</div>),
	lost: (
		<div>
			<p>We have lost contact with your local Xena Hub.</p>
			<p>To re-start it, you may reload this page.</p>
		</div>)
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

// up/down/launching/started/failed/failedStarting

var nextState = (state, status) =>
	status !== 'down' ? status :
	state === 'up' ? 'lost' :
	state;

var refresh = 2000;
var contactTimeout = 200;
var launchTimeout = 10 * 1000;
var bootTimeout = 2 * 60 * 1000;

var {of, interval} = Rx.Observable;

var wrap = (onStartup, Comp) => class extends PureComponent {
	static displayName = 'LaunchHelperWrapper';

	state = {advanced: false, show: false, status: 'down'};

	componentDidMount() {
		var shouldLaunch = !(this.props.localStatus === 'lost'),
			ping = interval(refresh).startWith(undefined)
				.switchMapTo(testStatus(localHub, contactTimeout).map(({status}) => status)).share(),
			firstDown = ping.first().filter(p => p === 'down'),
			pingStarted = ping.filter(p => p === 'started'),
			pingUp = ping.filter(p => p === 'up'),
			failed = of('failed'),
			failedStarting = of('failedStarting'),
			launching = of('launching'),

			boot = pingStarted.first().switchMapTo(failedStarting.delay(bootTimeout)),
			launch = firstDown.switchMap(() => shouldLaunch ? launching.concat(failed.delay(launchTimeout)) : failed),

			timeouts = launch.takeUntil(pingStarted).merge(boot).takeUntil(pingUp);

		this.sub = ping.merge(timeouts)
			.map(status => nextState(this.state.status, status))
			.distinctUntilChanged()
			.subscribe(this.updatePing);

		this.sub.add(firstDown.subscribe(this.showAndLaunch(shouldLaunch)));
	}

	componentWillUnmount() {
		if (this.timeoutID) {
			clearTimeout(this.timeoutID);
		}
		if (this.sub) {
			this.sub.unsubscribe();
		}
	}

	showAndLaunch = shouldLaunch => () => {
		this.setState({show: true});
		if (shouldLaunch) {
			launch();
		}
	}

	updatePing = nextStatus => {
		this.props.callback(['localStatus', nextStatus]);
		if (nextStatus === 'up' && this.state.status !== 'up') {
			onStartup(this.props);
			this.setState({show: false});
		}
		this.setState({status: nextStatus});
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

	actions = [
		{label: 'Close', onClick: this.onHide}
	];

	render() {
		var {advanced, status, show} = this.state,
			statusBadge =
				status === 'up' ? (
					<i title='Connected to local Xena Hub'
					   className={'material-icons ' + styles.badgeConnected}
					   onClick={this.onShow}>signal_wifi_4_bar</i>) : (
					<i title='Not connected to local Xena Hub. Click for details.'
					   className={'material-icons ' + styles.badgeDisconnected}
					   onClick={this.onShow}>signal_wifi_off</i>);

		return (
			<Comp {...this.props} badge={statusBadge}>
				<Dialog active={show} actions={this.actions}>
					<a className={styles.helpLink} href='https://ucsc-xena.gitbook.io/project/local-xena-hub' target='_blank'>Help</a>
					<h2>Starting Xena Hub </h2>
					{status === 'failed' ? <XenaDownload advanced={advanced} onShowAdvanced={this.onShowAdvanced}/> : null}
					{statusHelp[status]}
				</Dialog>
			</Comp>);
	}
};

var wrapLaunchHelper = (shouldMount, onStartup, Comp) => {
	var Wrapper = wrap(onStartup, Comp),
		LaunchHelperMounter = props => shouldMount(props) ? <Wrapper {...props}/> : <Comp {...props}/>;
	return LaunchHelperMounter;
};

export default wrapLaunchHelper;
