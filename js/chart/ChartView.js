var React = require('react');
import PureComponent from '../PureComponent';
import {showWizard} from './utils';
var _ = require('../underscore_ext').default;

var isBinary = (codes, data) => !codes && data &&
	_.flatten(data).every(c => _.indexOf([0, 1], c) !== -1 || c == null);

function castBinary(appState) {
	var {columns, data} = appState;
	// Using this pattern instead of mapObject to avoid creating a new
	// object if there are no updates. Not sure it matters.
	Object.keys(columns).forEach(id => {
		if (isBinary(_.getIn(columns, [id, 'codes']),
				_.getIn(data, [id, 'req', 'values']))) {
			appState = _.assocIn(appState, ['columns', id, 'codes'], ['0', '1']);
		}
	});

	return appState;
}

class ChartView extends PureComponent {
	state = {};

	componentDidMount() {
		Promise.all([
			import('./ChartWizard'),
			import('./chart')]).then(([{default: ChartWizard}, {default: Chart}]) => {
			this.setState({Chart, ChartWizard});
		});
	}

	render() {
		var {appState, ...otherProps} = this.props,
			{Chart, ChartWizard} = this.state,
			Mode = showWizard(appState) ? ChartWizard : Chart;
		return Mode ? <Mode appState={castBinary(appState)} {...otherProps}/> : <span/>;
	}
}

module.exports = ChartView;
