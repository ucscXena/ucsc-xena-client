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
var {times} = require('../underscore_ext');

// Styles
var compStyles = require('./Welcome.module.css');
var typStyles = require('../../css/typography.module.css');

// Images
var welcomeImg = require('../../images/iconXena.png');
var welcome2xImg = require('../../images/iconXena@2x.png');
var welcome3xImg = require('../../images/iconXena@3x.png');
let welcomeSrcSet = `${welcome2xImg} 2x, ${welcome3xImg} 3x`;

var Welcome = React.createClass({
	dismissWelcome: function() {
		this.props.onClick();
	},
	render() {
		var {link: [app, bookmark, text], count, i, linkProps, bulletProps} = this.props,
			link = `${document.location.origin}/${app}/?bookmark=${bookmark}`;
		return (
			<div className={compStyles.Welcome}>
				<div className={compStyles.welcomeIcon}>
					<img className={compStyles.imgXena} src={welcomeImg} srcSet={welcomeSrcSet}/>
				</div>
				<div className={compStyles.welcomeText}>
					<h1 className={typStyles.mdHeadline}>Welcome to the Xena Functional Genomics Explorer</h1>
					<h2 className={typStyles.mdSubhead}>UCSC Xena allows users to explore functional genomic data sets
						for correlations between genomic and/or phenotypic variables.</h2>
					<h2 className={typStyles.mdSubhead}>View live example: <a {...linkProps} href={link}
																			   target='_blank'>{text}</a></h2>
					<div className={compStyles.bulletWrapper}>
						<div className={compStyles.bullets}>
							{times(count, j => <div
													key={j}
													data-index={j}
													{...bulletProps}
													className={i === j ? compStyles.bulletActive : compStyles.bullet}>

													{'\u2022'}
												</div>)}
						</div>
					</div>
				</div>
				<div className={compStyles.closeIcon} onClick={this.dismissWelcome}>
					<i className='material-icons'>close</i>
				</div>
			</div>
		);
	}
});

module.exports = Welcome;
