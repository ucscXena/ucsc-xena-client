var React = require('react');
import PureComponent from './PureComponent';

class ChartView extends PureComponent {
	state = {};

	componentDidMount() {
		require.ensure(['./chart'], () => {
			var Chart = require('./chart').default;
			this.setState({Chart});
		});
	}

	render() {
		var Chart = this.state.Chart;
		return Chart ? <Chart {...this.props}/> : <span/>;
	}
}

module.exports = ChartView;
