'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['fb34475113dd2c3a8d95038004badcae',
		'FOXM1A, FOXM1B, FOXM1C transcript expression in tumor vs. normal samples'],
	['cacded9e96a7a505f357c8806f0e284e',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['553d7d1fa81f0be10409ee7bcf3fbd31',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['4bc244f52913641e2cd75bba43d96a85',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['0005ba1c0624f002302d0542697e4e68',
		'PDL1 (CD274) expression across 39 cancer types in TCGA and TARGET'],
	['ea04ae7f86a885f928b2c09de2ca51f3',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['2e4660f0e4c07821657ea3df1ddd7cb1',
		'ATRX, TERT, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['4d0061b6890fb1b82894287b02c95d7b',
		'Co-deletion of chromosome 1p and 19q in TCGA lower grade gliomas']];


var refresh = 5000; // ms between link switch
var WelcomeContainer = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	getInitialState() {
		return {link: links[Math.floor(Math.random() * links.length)]};
	},
	componentWillMount() {
		this.events('mouseover', 'mouseout');

		// Emit events on an interval, pausing if the user mouses-over
		// the target link. The timer restarts on mouse-out, so it won't
		// change immediately.
		this.sub = Rx.Observable.of(true).merge(this.ev.mouseout).flatMap(
			() => Rx.Observable.interval(refresh).takeUntil(this.ev.mouseover)
		).subscribe(() =>
			this.setState({link: links[Math.floor(Math.random() * links.length)]}));
	},
	componentWillUnmount() {
		this.sub.unsubscribe();
	},
	render() {
		var {link} = this.state;
		return (
			<Welcome
				linkProps={{onMouseOver: this.on.mouseover, onMouseOut: this.on.mouseout}}
				{...this.props}
				link={link} />);
	}
});

module.exports = WelcomeContainer;
