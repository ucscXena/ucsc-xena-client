/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Welcome bar component, displayed when user visits Xena. Dismissed by close icon in top right corner.
 *
 * Visibility of welcome bar is controlled by parent component.
 *
 * Single action, onClick, is invoked to update the visibility state of the welcome bar.
 */

'use strict';

// Core dependencies, components
var React = require('react');

// Styles
require('./Welcome.css');

// Images
var welcomeImg = require('../../images/iconXena.png');
var welcome2xImg = require('../../images/iconXena@2x.png');
var welcome3xImg = require('../../images/iconXena@3x.png');
let welcomeSrcSet = `${welcome2xImg} 2x, ${welcome3xImg} 3x`;

var Welcome = React.createClass({
	onShowDemo: function(e) {
		e.stopPropagation();
	},
	onShowWelcome: function() {
		this.props.onClick();
	},
	render() {
		return (
			<div className='Welcome' onClick={this.onShowWelcome}>
				<div className='welcomeIcon'>
					<img src={welcomeImg} srcSet={welcomeSrcSet}/>
				</div>
				<div className='welcomeText'>
					<h1 className='md-headline'>Welcome to the Xena Functional Genomics Explorer</h1>
					<h2 className='md-subhead'>UCSC Xena allows users to explore functional genomic data sets
						for correlations between genomic and/or phenotypic variables.</h2>
					<h2 className='md-subhead'>View live example: <a href='http://www.google.com'
																	 target='_blank'
																	 onClick={this.onShowDemo}>TP53
						Expression vs. Mutation in
						TCGA Pan-Cancer</a></h2>
				</div>
				<div className='closeIcon'>
					<i className='material-icons'>close</i>
				</div>
			</div>
		);
	}
});

module.exports = Welcome;
