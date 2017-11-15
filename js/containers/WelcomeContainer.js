'use strict';

var React = require('react');
var Rx = require('../rx');
var Welcome = require('../views/Welcome');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

var links = [
	['heatmap', '8ff9f773bbabafece2259a0249e5a013',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', '27d8bc5b7904f768374a1eeae9baed81',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma'],
	['heatmap', 'd763ecad2c49bb745ea5031e7c239ec2',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', 'a9bfaf0d54c826bc1c8d1f5423df4818',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['heatmap', 'b095250231c43f1ff5e071ebf5cf3d0b',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', 'e9493253e163d8570a55f83eabe1c4f8',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', '04b175f632ff1c1c0fbddb2d271aa3df',
		'TERT, ATRX, TP53 in lower grade glioma. Two pathways to telomere lengthening'],
	['heatmap', '0bf10d0dd69ee9871fe0abce78a96dbc',
		'Co-deletion of chromosome 1p and 19q in TCGA lower grade gliomas'],
	['transcripts', '48b01d48b554be306b58aef69ea276ff',
		'KRAS isoform expression in TCGA pancreatic cancer vs. GTEx pancreas normal']];


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
