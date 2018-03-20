'use strict';

var {Component} = require('react');
var {isEqual} = require('./underscore_ext');


class PureComponent extends Component {
	shouldComponentUpdate(nextProps, nextState) {
		return !isEqual(nextProps, this.props) ||
			!isEqual(nextState, this.state);
	}
}

export default PureComponent;
