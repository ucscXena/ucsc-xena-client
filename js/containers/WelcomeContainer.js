'use strict';

import PureComponent from '../PureComponent';
var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEvents} = require('../react-utils');

var links = [
	['heatmap', 'ef22bef7c049426ceb011f0a7914ddc4',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', 'a659e770d2599acfad6a8f9b5ffbe57f',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['heatmap', '6946d911d6b0cd473c442fe99f6a695a',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', 'e5329f4cc13b80c91d3fd6810aac1a93',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['heatmap', 'f9d1b795c2cb324d227a3a0472c3427c',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', '1ee78896f84e5c0b55c6bd9ff1decff1',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', '6eca4f596dc04446b6fcee5c62a28af2',
		'Two pathways to telomere lengthening in lower grade glioma: TERT & ATRX'],
	['heatmap', 'eb974f284bbffecffdf7438685e65a97',
		'Genetic separation of lower grade gliomas: one characterized by loss of chromosome arms 1p and 19q, \
		the other by TP53 mutations.'],
	['transcripts', '25a9782db8c1166ce7bae6686e98124c',
		'KRAS isoform expression in TCGA pancreatic cancer vs. GTEx pancreas normal']];


var evToIndex = ev => parseInt(ev.currentTarget.dataset.index, 10);

var refresh = 5000; // ms between link switch

class WelcomeContainer extends PureComponent {
	state = {link: 0};

	componentWillMount() {
		var events = rxEvents(this, 'mouseover', 'mouseout', 'bulletover');
		var {mouseover, mouseout, bulletover} = events;

		// Emit events on an interval, pausing if the user mouses-over
		// the target link. The timer restarts on mouse-out, so it won't
		// change immediately.
		this.sub = Rx.Observable.of(true).merge(mouseout).flatMap(
			() => Rx.Observable.interval(refresh).takeUntil(mouseover.merge(bulletover)).map(() => undefined)
		).merge(bulletover.map(evToIndex)).subscribe(i =>
			this.setState({link: i === undefined ? (this.state.link + 1) % links.length : i}));
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	render() {
		var {link} = this.state;
		return (
			<Welcome
				count={links.length}
				i={link}
				linkProps={{onMouseOver: this.on.mouseover, onMouseOut: this.on.mouseout}}
				bulletProps={{onMouseOver: this.on.bulletover, onMouseOut: this.on.mouseout}}
				{...this.props}
				link={links[link]} />);
	}
}

module.exports = WelcomeContainer;
