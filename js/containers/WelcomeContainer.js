
import PureComponent from '../PureComponent';
var React = require('react');
var Welcome = require('../views/Welcome');

var links = [
	['heatmap', '634da50313613e659e865c2bfb958ea1',
		'FOXM1a, FOXM1b, FOXM1c transcript expression in tumor vs. normal samples'],
	['heatmap', '2e553fc5ca9858653e225fabce0c36ab',
		'ERG-TMPRSS2 fusion by chr21 deletion in prostate cancer'],
	['heatmap', 'c03d52bed79d2b474ffcef679796a12d',
		'KM plot (overall survival) of breast cancer PAM50 subtypes'],
	['heatmap', 'd5de509a8ff0032298a0547c97638e3f',
		'Genetic separation of lower grade gliomas: one characterized by loss of chromosomes 1p & 19q, \
		the other by TP53 & ATRX mutations.'],
	['heatmap', '16e1d1a37ab7d9820a6bf1399ce5135e',
		'PDL1 and PD1 expression across 39 cancer types in TCGA and TARGET'],
	['heatmap', '3547cb283a111e68991e9b8a8d5f8b42',
		'MGMT promoter DNA methylation is inversely correlated with MGMT expression'],
	['heatmap', 'c6429007551de3bf0ea491c96814a1cf',
		'Copy number for EGFR, PTEN, chromosome 1, 7, 10, 19 in TCGA brain tumors'],
	['transcripts', '75fd7d99bbc1bb04aae9b4e5e34b077f',
		'KRAS isoform expression in TCGA pancreatic cancer vs. GTEx pancreas normal'],
	['heatmap', 'ba5edb23fe570ef22f5f518859ca0911',
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
