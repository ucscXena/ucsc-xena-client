import PureComponent from '../PureComponent';
var _ = require('../underscore_ext').default;
var React = require('react');

export var createVignette = (steps, Component) => class extends PureComponent {
	state = {
		state: -1
	}

	start = () => {
		this.setState({state: 0});
	}

	next = () => {
		var state = this.state.state;

		this.setState({state: state === steps / 2 - 1 ? -1 : state + 1});
	}

	cancel = () => {
		this.setState({state: -1});
	}

	render() {
		var methods = _.pick(this, 'start', 'next', 'cancel'),
			bubbles = _.object(
				_.chunk(steps, 2).map(([name, renderHelp], i) =>
					[name,
					target => (
						<div style={{position: 'relative'}}>
							{target}
							{i === this.state.state ? renderHelp({onClose: this.next}) : null}
						</div>)]));

		return <Component {...this.props} {...bubbles} help={methods} />;
	}
};
