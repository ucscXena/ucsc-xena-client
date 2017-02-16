'use strict';
var React = require('react');
var _ = require('../underscore_ext');

var styles = {
	YAxisLabel: {
		WebkitTransform: 'translate(-100%, 0) rotate(270deg)',
		MozTransform: 'translate(-100%, 0) rotate(270deg)',
		msTransform: 'translate(-100%, 0) rotate(270deg)',
		OTransform: 'translate(-100%, 0) rotate(270deg)',
		transform: 'translate(-100%, 0) rotate(270deg)',
		WebkitTransformOrigin: '0 100%',
		MozTransformOrigin: '0 100%',
		msTransformOrigin: '0 100%',
		OTransformOrigin: '0 100%',
		transformOrigin: '100% 0'
	},
	YAxisWrapper: {
		overflow: 'hidden'
	}
};

var YAxisLabel = React.createClass({
	render: function () {
		// XXX would prefer to enforce that these keys are present & destructure
		var height = _.getIn(this.props, ['zoom', 'height']),
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			length = _.getIn(this.props, ['samples', 'length']) || 0,
			fraction = count === length ? '' :
				`Zoomed to ${index} - ${index + count - 1} (N=${count})`,
			text = 'Samples (N=' + length.toLocaleString() + ')';

		return (
			<div style={{...styles.YAxisWrapper, height: height}} className="YAxisWrapper">
				<p style={{...styles.YAxisLabel, width: height}} className="YAxisLabel">{text}<br/>{fraction}</p>
			</div>);
	}
});

module.exports = YAxisLabel;
