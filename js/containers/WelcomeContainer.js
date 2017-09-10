'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['dca6a57487582b74dc40bd89ea157b4a',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['800d27b989a11cc5071d647382bee92e',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['c6228169802fc9d93f49ff0c05c02dcc',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['67bdf79de94cde8e10db851b6b57163b',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['8c8af76cf8f728bad113c6d863c991ad',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['8a391e3bf4e6c27750423cd124071795',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['7c69691944d8f08bad1882ddf168b414',
		'TERT, ATRX, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['06c4204e6e7ace87773a3ac1c4fa9b10',
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
