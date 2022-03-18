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


// Core dependencies, components
import {Box, Icon, IconButton, Typography} from '@material-ui/core';
import React, { Component } from 'react';
var {times} = require('./../underscore_ext').default;
import XTypography, {XTypographyVariants} from './XTypography';

// Styles
import compStyles from'./Welcome.module.css';

// Images
import welcomeImg from '../../images/iconXena.png';
import welcome2xImg from '../../images/iconXena@2x.png';
import welcome3xImg  from '../../images/iconXena@3x.png';

let welcomeSrcSet = `${welcome2xImg} 2x, ${welcome3xImg} 3x`;

class Welcome extends Component {
	dismissWelcome = () => {
		this.props.onClick();
	};
	render() {
		const {link: [app, bookmark, text], count, i, linkProps, bulletProps} = this.props,
			link = `${document.location.origin}/${app}/?bookmark=${bookmark}`;
		return(
			<Box bgcolor='primary.main' className={compStyles.Welcome} color='primary.contrastText'>
				<div className={compStyles.welcomeIcon}>
					<img className={compStyles.imgXena} src={welcomeImg} srcSet={welcomeSrcSet}/>
				</div>
				<div className={compStyles.welcomeText}>
					<XTypography component='h1' variant={XTypographyVariants.MD_HEADLINE}>Welcome to the Xena Functional Genomics Explorer</XTypography>
					<Typography component='h2' variant='subtitle2'>UCSC Xena allows users to explore functional genomic data sets
						for correlations between genomic and/or phenotypic variables.</Typography>
					<Typography component='h2' variant='subtitle2'>View live example: <a {...linkProps} href={link} target='_blank'>{text}</a></Typography>
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
				<IconButton className={compStyles.closeIcon} color='inherit' onClick={this.dismissWelcome}>
					<Icon>close</Icon>
				</IconButton>
			</Box>
		);
	}

}

module.exports = Welcome;
