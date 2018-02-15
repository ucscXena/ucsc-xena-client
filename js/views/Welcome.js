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
import React from 'react';
import {times} from './../underscore_ext';

// Styles
import compStyles from'./Welcome.module.css';
import typStyles from '../../css/typography.module.css';

// Images
import welcomeImg from '../../images/iconXena.png';
import welcome2xImg from '../../images/iconXena@2x.png';
import welcome3xImg  from '../../images/iconXena@3x.png';

let welcomeSrcSet = `${welcome2xImg} 2x, ${welcome3xImg} 3x`;

class Welcome extends React.Component{
	dismissWelcome(){
		this.props.onClick();
	}
	render(){
		const {link: [app, bookmark, text], count, i, linkProps, bulletProps} = this.props,
			link = `${document.location.origin}/${app}/?bookmark=${bookmark}`;
		return(
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
				<div className={compStyles.closeIcon} onClick={this.dismissWelcome.bind(this)}>
					<i className='material-icons'>close</i>
				</div>
			</div>
		)
	}

}

module.exports = Welcome;
