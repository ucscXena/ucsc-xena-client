
import PureComponent from '../PureComponent';
var React = require('react');
var Welcome = require('../views/Welcome');

var links = [
	['heatmap', 'bc7f3f46b042bcf5c099439c2816ff01',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', 'cd6d8adead7d720fea7df197dc807147',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', 'e381bdc7dffb8af7d934d97335c08fb3',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', '873b5bdf3633ce8c57598d7052b13c7b',
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

class WelcomeContainer extends PureComponent {
	state = {link: 0};

	// User interaction with the arrow buttons sets the active link state to the previous or next link.
	onChangeLink = (increment) => {
		this.setState({link: this.state.link + increment});
	}

	render() {
		var {link: i} = this.state;
		return (
			<Welcome
				activeLink={i}
				links={links}
				onChangeLink={this.onChangeLink}
				{...this.props} />);
	}
}

export default WelcomeContainer;
