import {el, span} from '../chart/react-hyper.js';
import PureComponent from '../PureComponent';

export default class extends PureComponent {
	state = {};

	componentDidMount() {
		import('./ApplicationContainer').then(({default: ApplicationContainer}) => {
			this.setState({ApplicationContainer: el(ApplicationContainer)});
		});
	}
	render() {
		var {ApplicationContainer} = this.state;
		return ApplicationContainer ? ApplicationContainer(this.props) : span();
	}
}

