/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Navigation component.
 *
 * This is a light wrapper component around React Toolbox's AppBar component.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('./underscore_ext');
import AppBar from 'react-toolbox/lib/app_bar';
import Navigation from 'react-toolbox/lib/navigation';
import {ThemeProvider} from 'react-css-themr';
import Link from 'react-toolbox/lib/link';
var navTheme = require('./navTheme');
var BookmarkMenu = require('./views/BookmarkMenu');
var {servers: {localHub}} = require('./defaultServers');

// Styles
var compStyles = require('./nav.module.css');

// Images
var logoSantaCruzImg = require('../images/logoSantaCruz.png');
var logoSantaCruz2xImg = require('../images/logoSantaCruz@2x.png');
var logoSantaCruz3xImg = require('../images/logoSantaCruz@3x.png');

// Locals
var links = [
	{label: 'Data Sets', nav: 'datapages'},
	{label: 'Visualization', nav: 'heatmap'},
	{label: 'Transcripts', nav: 'transcripts'},
	{label: 'Data Hubs', nav: 'hub'},
	// {href: 'https://genome-cancer.ucsc.edu/download/public/get-xena/index.html', label: 'Local Xena'},
	{label: 'View My Data', nav: 'datapages', params: {addHub: localHub, host: localHub}},
	{href: 'http://xena.ucsc.edu/xena-python-api/', label: 'Python'},
];

var helpLink = {
	href: 'https://ucsc-xena.gitbook.io/project/',
	label: 'Help',
	target: '_blank'
};

var active = (l, activeLink) => l.nav === activeLink;

class XenaNav extends React.Component {
	render() {
		let {isPublic, activeLink, getState, onImport} = this.props;
		let routes = _.map(links, l => {
			var {nav, params, ...others} = l,
			onClick = nav ? () => this.props.onNavigate(nav, params) : undefined;
			return {...others, onClick, active: active(l, activeLink)};
		});
		let logoSrcSet = `${logoSantaCruz2xImg} 2x, ${logoSantaCruz3xImg} 3x`;
		return (
			<AppBar className={compStyles.NavAppBar}>
				<a href='http://xena.ucsc.edu/' className={compStyles.logoXena}><img title={window.ga ? '' : 'no analytics'} src={logoSantaCruzImg} srcSet={logoSrcSet}/></a>
				<Navigation type="horizontal" routes={routes}>
					{getState ? <BookmarkMenu isPublic={isPublic} getState={getState} onImport={onImport}/> : null}
					<Link {...helpLink} />
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

module.exports = props => ReactDOM.render(<ThemedNav {...props} />, nav);
