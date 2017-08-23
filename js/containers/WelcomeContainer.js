'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['da4ff33d35d9c83f3459c383897371b1',
		'Overall survival difference of TERT over- vs under-expressed patients'],
	['b34336d5c5cff6583f2f617aea022d10',
		'Co-deletion of 1p, 19q in Lower Grade Glioma oligodendroglioma subtype'],
	['e093b1c13486b1bf19c1f4f957bb4343',
		'Overall survival difference of patients with/without an IDH1 mutation'],
	['f356e922ae5891367c62f128fca17a10',
		'CNV amplification of EGFR in GBM samples compared to LGG in TCGA'],
	['f070d9f3563b951cc20d6dd2975c0e0e',
		'Overall survival profile of different breast cancer PAM50 subtypes'],
	['d2a79e46e22456036a732c49c2e4c5b3',
		'Mutation pile-ups in introns overlap enhancer regions in ICGC Lymphoma'],
	['c76c69014656ad834d41cd9e619a1468',
		'Transcript expression of FOXM1A, B, C. TCGA tumor vs GTEx normal'],
	['1c880a8cab1359f89b4be28272fc59c6',
		'ATRX, TERT in Lower Grade Glioma. Two pathways to telomere lengthening']];

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
		clearInterval(this.timeout);
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
