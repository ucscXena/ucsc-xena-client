
import PureComponent from '../PureComponent';
var React = require('react');
var Rx = require('../rx').default;
var Welcome = require('../views/Welcome');
var {rxEvents} = require('../react-utils');

var links = [
	['heatmap', 'bc7f3f46b042bcf5c099439c2816ff01',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', 'cd6d8adead7d720fea7df197dc807147',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', 'e381bdc7dffb8af7d934d97335c08fb3',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', '6451afae2ee964475a2eb9c79d46900c',
		'Genetic separation of lower grade gliomas: one characterized by loss of chromosomes 1p & 19q, \
		the other by TP53 & ATRX mutations.'],
	['heatmap', '3f4b3fa8901f4c24f5f791e036566424',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', '2dc4735dd97964b7c2a57afe053a9764',
		'MGMT promoter DNA methylation is inversely correlated with MGMT expression'],
	['heatmap', '0f9954a525987445ba7faef1e2081027',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['transcripts', '75fd7d99bbc1bb04aae9b4e5e34b077f',
		'KRAS isoform expression in TCGA pancreatic cancer vs. GTEx pancreas normal'],
	['heatmap', 'dfc37064d62ea0c0302881c05277b7b3',
		'Mutation pile-ups in intron enhancers in ICGC lymphoma']];

var refresh = 5000; // ms between link switch

class WelcomeContainer extends PureComponent {
	state = {link: 0};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'arrowover', 'mouseover', 'mouseout');
		var {arrowover, mouseover, mouseout} = events;

		// Emit events on an interval, pausing if the user mouses-over
		// the target link. The timer restarts on mouse-out, so it won't
		// change immediately.
		this.sub = Rx.Observable.of(true).merge(mouseout).flatMap(
			() => Rx.Observable.interval(refresh).takeUntil(mouseover.merge(arrowover)).map(() => undefined)
		).subscribe(() =>
			this.setState({link: (this.state.link + 1) % links.length}));
	}

	componentWillUnmount() {
		this.sub.unsubscribe();
	}

	// User interaction with the arrow buttons sets the active link state to the previous or next link.
	onChangeLink = (increment) => {
		let newIndex = this.state.link + increment; /* Increment active link index. */
		const lastLinkIndex = links.length - 1;
		if (newIndex < 0) {
			newIndex = lastLinkIndex; /* If the new index is negative, the last link becomes active. */
		} else if (newIndex > lastLinkIndex) {
			newIndex = 0; /* If the new index is greater than the number of possible links, the first link becomes active. */
		}
		this.setState({link: newIndex});
	}

	render() {
		var {link: i} = this.state;
		return (
			<Welcome
				arrowProps={{onMouseOver: this.on.arrowover, onMouseOut: this.on.mouseout}}
				linkProps={{onMouseOver: this.on.mouseover, onMouseOut: this.on.mouseout}}
				links={links.slice(i).concat(links.slice(0, i))}
				onChangeLink={this.onChangeLink}
				{...this.props} />);
	}
}

export default WelcomeContainer;
