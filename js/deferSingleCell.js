import {el, span} from './chart/react-hyper.js';
import PureComponent from './PureComponent';

export default class extends PureComponent {
	state = {};

	componentDidMount() {
		import('./SingleCell').then(({default: SingleCell}) => {
			this.setState({SingleCell: el(SingleCell)});
		});
	}
	render() {
		var {SingleCell} = this.state;
		return SingleCell ? SingleCell(this.props) : span();
	}
}
