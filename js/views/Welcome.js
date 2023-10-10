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
var classNames = require('classnames');
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
	constructor(props) {
		super(props);
		this.state = {disableBackward: true, disableForward: false};
		this.observerRef = React.createRef();
		this.linksRef = React.createRef();
	}

	onIntersection = (entries) => {
		entries.forEach(({target, isIntersecting}) => {
			if (target.id === "first") {
				this.setState({disableBackward: isIntersecting});
			}
			if (target.id === "last") {
				this.setState({disableForward: isIntersecting});
			}
		});
	};

	componentDidMount() {
		this.linksRef.current.firstChild.id = "first";
		this.linksRef.current.lastChild.id = "last";
		this.observerRef.current = new IntersectionObserver(this.onIntersection, {threshold: 1.0});
		this.observerRef.current.observe(this.linksRef.current.firstChild);
		this.observerRef.current.observe(this.linksRef.current.lastChild);
	}

	componentWillUnmount() {
		this.observerRef.current.disconnect();
	}

	dismissWelcome = () => {
		this.props.onClick();
	};

	render() {
			const {activeLink, links, onChangeLink} = this.props,
			{disableBackward, disableForward} = this.state;
		return(
			<Box bgcolor='primary.main' className={compStyles.welcome} color='primary.contrastText'>
				<div className={compStyles.welcomeIcon}>
					<img alt='UCSC Xena' className={compStyles.imgXena} src={welcomeImg} srcSet={welcomeSrcSet}/>
				</div>
				<div className={compStyles.welcomeText}>
					<XTypography component='h1' variant={XTypographyVariants.MD_HEADLINE}>Welcome to the Xena Functional Genomics Explorer</XTypography>
					<Typography component='h2' variant='subtitle2'>UCSC Xena allows users to explore functional genomic data sets for correlations between genomic and/or phenotypic variables. See our live examples:</Typography>
					<div className={compStyles.welcomeExamples} ref={this.linksRef}>
						{links.map(([app, bookmark, text], i) =>
							<a className={classNames(compStyles.welcomeExample, {[compStyles.hidden]: i < activeLink})} key={text} href={`${document.location.origin}/${app}/?bookmark=${bookmark}`} target='_blank'>
								<span className={compStyles.welcomeExampleText}>{text}</span><ExpandMoreIcon className={compStyles.welcomeExampleIcon}/>
							</a>
						)}
					</div>
					<Box display='inline-block' mt={3}>
						<IconButton color='inherit' disabled={disableBackward} edge='start' onClick={() => onChangeLink(-1)} size='small'><SvgIcon fontSize='large'><path d='M10 18L11.4 16.55L7.85 13H20V11H7.85L11.4 7.45L10 6L4 12L10 18Z' fill='currentColor'/></SvgIcon></IconButton>
						<IconButton color='inherit' disabled={disableForward} onClick={() => onChangeLink(1)} size='small'><SvgIcon fontSize='large'><path d='M14 18L12.6 16.55L16.15 13H4V11H16.15L12.6 7.45L14 6L20 12L14 18Z' fill='currentColor'/></SvgIcon></IconButton>
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
