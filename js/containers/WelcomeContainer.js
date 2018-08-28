'use strict';

import PureComponent from '../PureComponent';
var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEvents} = require('../react-utils');

var links = [
	['heatmap', 'bc7f3f46b042bcf5c099439c2816ff01',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', 'cd6d8adead7d720fea7df197dc807147',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', 'e617e2f31b2a02690e80f4b6acc55ff3',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', '937469da6dfa9171cd255884b53cb75e',
		'Genetic separation of lower grade gliomas: one characterized by loss of chromosomes 1p & 19q, \
		the other by TP53 & ATRX mutations.'],
	['heatmap', '3f4b3fa8901f4c24f5f791e036566424',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', '05690ede046dc7b9f98ea78d1cbc5c2e',
		'MGMT promoter DNA methylation is inversely correlated with MGMT expression'],
	['heatmap', '8772bbc8f47c5cda31e4737c7f88444d',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['transcripts', '25a9782db8c1166ce7bae6686e98124c',
		'KRAS isoform expression in TCGA pancreatic cancer vs. GTEx pancreas normal'],
	['heatmap', 'b62b660e6029947f51ce5745945cce90',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma']];


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
