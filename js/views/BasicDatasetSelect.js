'use strict';
var React = require('react');
var _ = require('../underscore_ext');
import {Checkbox} from 'react-toolbox/lib/checkbox';


var BasicDatasetSelect = React.createClass({
	onChange(dsID) {
		console.log(dsID);
		if (dsID) {
			this.props.onSelect(dsID);
		}
	},
	render() {
		var {preferred} = this.props;
		return (
			<div>
				{_.flatmap(preferred, ({dsID, label}) => <Checkbox key={label} label={label}
																   onChange={() => this.onChange(dsID)}/>)}
			</div>
		);
	}
});

module.exports = BasicDatasetSelect;
