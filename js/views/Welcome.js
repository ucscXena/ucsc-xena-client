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
import {Box, Icon, IconButton, SvgIcon, Typography} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { Component } from 'react';
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
		const {arrowProps, linkProps, links, onChangeLink} = this.props;
		return(
			<Box bgcolor='primary.main' className={compStyles.welcome} color='primary.contrastText'>
				<div className={compStyles.welcomeIcon}>
					<img className={compStyles.imgXena} src={welcomeImg} srcSet={welcomeSrcSet}/>
				</div>
				<div className={compStyles.welcomeText}>
					<XTypography component='h1' variant={XTypographyVariants.MD_HEADLINE}>Welcome to the Xena Functional Genomics Explorer</XTypography>
					<Typography component='h2' variant='subtitle2'>UCSC Xena allows users to explore functional genomic data sets for correlations between genomic and/or phenotypic variables. See our live examples:</Typography>
					<div className={compStyles.welcomeExamples}>
						{links.map(([app, bookmark, text]) =>
							<a className={compStyles.welcomeExample} key={text} href={`${document.location.origin}/${app}/?bookmark=${bookmark}`} target='_blank' {...linkProps}>
								<span className={compStyles.welcomeExampleText}>{text}</span><ExpandMoreIcon className={compStyles.welcomeExampleIcon}/>
							</a>
						)}
					</div>
					<Box display='inline-block' mt={3} {...arrowProps}>
						<IconButton edge='start' onClick={() => onChangeLink(-1)} size='small'><SvgIcon fontSize='large'><path d='M10 18L11.4 16.55L7.85 13H20V11H7.85L11.4 7.45L10 6L4 12L10 18Z' fill='#FAFAFA'/></SvgIcon></IconButton>
						<IconButton onClick={() => onChangeLink(1)} size='small'><SvgIcon fontSize='large'><path d='M14 18L12.6 16.55L16.15 13H4V11H16.15L12.6 7.45L14 6L20 12L14 18Z' fill='#FAFAFA'/></SvgIcon></IconButton>
					</Box>
				</div>
				<IconButton className={compStyles.closeIcon} color='inherit' onClick={this.dismissWelcome}>
					<Icon>close</Icon>
				</IconButton>
			</Box>
		);
	}
}

module.exports = Welcome;
