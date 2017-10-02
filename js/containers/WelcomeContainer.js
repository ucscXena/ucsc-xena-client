'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['9cefe9084d867f10ca00e6a4a641987d',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['27d8bc5b7904f768374a1eeae9baed81',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['73f3cc8ab6f934e605a2f3568d00f91a',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['a9bfaf0d54c826bc1c8d1f5423df4818',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['b095250231c43f1ff5e071ebf5cf3d0b',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['0c994f539703ddae5e7f8ca0153e7c28',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['e52775e76ecb7179306ae74c29742ecf',
		'TERT, ATRX, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['0bf10d0dd69ee9871fe0abce78a96dbc',
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
