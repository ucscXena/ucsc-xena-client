'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['afde237fe86016c42cf9c508ff443a65',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['27d8bc5b7904f768374a1eeae9baed81',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['fe50ac4b7dce75c460d1a7d46c55c049',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['6145233b5e8421a6dbb62f677728d7a8',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['b095250231c43f1ff5e071ebf5cf3d0b',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['288e299bcd917d0c1e7cfbe4658ee830',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['a0a591a997198c4ffc3d66380e9c1d97',
		'TERT, ATRX, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['fdb3fa1573bc4f293281c6059e7ca702',
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
