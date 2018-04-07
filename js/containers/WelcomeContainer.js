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
	['heatmap', 'dfe255e4b019a5a895d5c214db0f075e',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', '8781d82f49888ed62edbc51cb1018634',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['heatmap', 'f9d1b795c2cb324d227a3a0472c3427c',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', '70d808333cc4386e83646d48bb5f168c',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', '1ea93a012b832a72aaee9063549bf90d',
		'Two pathways to telomere lengthening in lower grade glioma'],
	['heatmap', '4e74d5763970ebc5821878cf111e0f4a',
		'Genetic separation of lower grade gliomas into two disease entities: \
		one characterized by loss of chromosome arms 1p and 19q and TERT over-expresssion, \
		the other by TP53 and ATRX mutations.'],
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
