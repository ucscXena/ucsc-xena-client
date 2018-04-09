'use strict';

var React = require('react');
import PureComponent from '../PureComponent';
import Ties from '../views/TiesPlaceholder';
var {pick} = require('../underscore_ext');

class TiesContainer extends PureComponent {
	static displayName = 'TiesContainer';

	onAddTerm = term => {
		this.props.callback(['ties-add-term', term]);
	}

	onKeepRow = (index, keep) => {
		this.props.callback(['ties-keep-row', index, keep]);
	}

	onShowDoc = index => {
		this.props.callback(['ties-show-doc', index]);
	}

	onHideDoc = () => {
		this.props.callback(['ties-hide-doc']);
	}

	onPage = page => {
		this.props.callback(['ties-set-page', page]);
	}

	onCreateColumn = () => {
		console.log('onCreateColumn FIXME');
		// getColSpec, blah blah
	}

	onDismiss = () => {
		this.props.callback(['ties-dismiss']);
	}

	render() {
		var handlers = pick(this, ['onAddTerm', 'onKeepRow', 'onShowDoc',
				'onHideDoc', 'onPage', 'onCreateColumn', 'onDismiss']);
		return (
			<Ties
				state={this.props.appState}
				{...handlers}/>);
	}
}

export default TiesContainer;
