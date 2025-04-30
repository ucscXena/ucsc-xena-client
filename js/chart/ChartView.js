import React from 'react';
import PureComponent from '../PureComponent';
import {showWizard} from './utils';

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
		return Mode ? <Mode appState={appState} {...otherProps}/> : <span/>;
	}
}

export default ChartView;
