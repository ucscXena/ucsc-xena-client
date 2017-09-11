'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['dca6a57487582b74dc40bd89ea157b4a', //need to wait for identifiers available to rebuild
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['9ede8655cbc1d57fa58481a297130df5',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['9445ff71d65e4f29ab19d2dc2763228f',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['60511652e3c56da160672127d6ef1d26',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['8c8af76cf8f728bad113c6d863c991ad',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['a308ca916ba2a1abf2c8099cc2eba438',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['b7d84ed0979038effa03e69c680c4f2f',
		'TERT, ATRX, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['35bca53470f7896a7e87a6acfb9459a7',
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
