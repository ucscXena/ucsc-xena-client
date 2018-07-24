'use strict';

var {Component} = require('react');
var {isEqual} = require('./underscore_ext');

var logDiff; //eslint-disable-line no-unused-vars

if (process.env.NODE_ENV !== 'production') {
	logDiff = function(comp, nextProps, nextState) {
		if (!isEqual(comp.props, nextProps)) {
			console.log(comp.constructor.displayName, 'props differ:');
			Object.keys(comp.props).forEach(p => {
				if (!nextProps.hasOwnProperty(p)) {
					console.log('key deleted:', p);
				} else if (!isEqual(comp.props[p], nextProps[p])) {
					console.log('key changed:', p);
				}
			});
			Object.keys(nextProps).forEach(p => {
				if (!comp.props.hasOwnProperty(p)) {
					console.log('key added:', p);
				};
			});
		}
		if (!isEqual(comp.state, nextState)) {
			console.log(comp.constructor.displayName, 'state differs:');
			Object.keys(comp.state).forEach(p => {
				if (!nextState.hasOwnProperty(p)) {
					console.log('key deleted:', p);
				} else if (!isEqual(comp.state[p], nextState[p])) {
					console.log('key changed:', p);
				}
			});
			Object.keys(nextState).forEach(p => {
				if (!comp.state.hasOwnProperty(p)) {
					console.log('key added:', p);
				};
			});
		}
	};
}

class PureComponent extends Component {
	shouldComponentUpdate(nextProps, nextState) {
//		logDiff(this, nextProps, nextState);
		return !isEqual(nextProps, this.props) ||
			!isEqual(nextState, this.state);
	}
}

export default PureComponent;
