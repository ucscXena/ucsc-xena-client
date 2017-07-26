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
var config = require('./config');
import AppBar from 'react-toolbox/lib/app_bar';
import Navigation from 'react-toolbox/lib/navigation';
import {ThemeProvider} from 'react-css-themr';
var navTheme = require('./navTheme');

// Styles
var compStyles = require('./navTheme.module.css');

// Images
var logoSantaCruzImg = require('../images/logoSantaCruz.png');
var logoSantaCruz2xImg = require('../images/logoSantaCruz@2x.png');
var logoSantaCruz3xImg = require('../images/logoSantaCruz@3x.png');

// Locals
var links = [
	// {href: 'http://xena.ucsc.edu', label: 'Home'},
	{href: '../datapages/', label: 'Data Sets'},
	{href: '../heatmap/', label: 'Visualization'},
	{href: '../hub/', label: 'Data Hubs'},
	// {href: 'https://genome-cancer.ucsc.edu/download/public/get-xena/index.html', label: 'Local Xena'},
	{href: 'http://xena.ucsc.edu/private-hubs/', label: 'View My Data'},
	{href: 'http://xena.ucsc.edu/xena-python-api/', label: 'Python'},
	{href: 'https://genome-cancer.ucsc.edu/proj/site/composite/heatmap/#nostate', label: 'Beta Features'},
	{
		href: 'https://docs.google.com/a/soe.ucsc.edu/document/d/1CIWj6L8LAaHFmLek3yrbrjFKRm_l3Sy73lJ4wY-WM8Y',
		label: 'Help'
	}
];

var active = (l, activeTab) => l.label === activeTab;

var XenaNav = React.createClass({
	getInitialState: function () {
		let path = window.location.pathname.slice(config.baseurl.length - 1),
			defaultLink = _.find(links, l => l.label === 'Visualization'),
			activeLink = path === "/" ? defaultLink : (_.find(links, l => l.href.includes(path)) || defaultLink);
		return {activeTab: activeLink.label};
	},
	render: function () {
		let {activeTab} = this.state;
		let routes = _.map(links, l => {
			return {...l, active: active(l, activeTab)};
		});
		let logoSrcSet = `${logoSantaCruz2xImg} 2x, ${logoSantaCruz3xImg} 3x`;
		return (
			<AppBar className={compStyles.NavAppBar}>
				<a href='/'><img className={compStyles.logoXena} src={logoSantaCruzImg} srcSet={logoSrcSet}/></a>
				<Navigation type="horizontal" routes={routes}/>
			</AppBar>
		);
	}
});

var ThemedNav = React.createClass({
	render() {
		return (
			<ThemeProvider theme={navTheme}>
				<XenaNav {...this.props}/>
			</ThemeProvider>);
	}
});

var nav = document.getElementById('navMenuMain');

ReactDOM.render(<ThemedNav />, nav);
