'use strict';

var React = require('react');
import PureComponent from './PureComponent';

var geneLableFont = 12;
var maxLane = 5;

class GeneLabelAnnotation extends PureComponent {
	render() {
		var {width, height, list, subColumnIndex} = this.props;

		var	subColWidth = width / list.length,
			aveSize = subColumnIndex.aveSize,
			laneNum = Math.ceil(list.length / (width / aveSize)),
			laneHeight = height / laneNum;

		var items = laneNum > maxLane ? null : list.map((text, index) => { // display at most 5 lanes
			var left = subColWidth * index,
				bottom = laneHeight * (index % laneNum) - height,
				textWidth = width - left,
				color = subColumnIndex && index === subColumnIndex.index ? 'red' : 'black',
				fontWeight = subColumnIndex && index === subColumnIndex.index ? 'bold' : 'normal';

			return (
				<div key={index}
					style={{
						left: left,
						bottom: bottom,
						position: 'absolute',
						width: textWidth,
						overflow: 'hidden',
						fontSize: geneLableFont}}>
					<label style = {{color: color, fontWeight: fontWeight}}>
						{text}
					</label>
				</div>);
		});

		return (
			<div>
				{items}
			</div>
		);
	}
}

module.exports = {GeneLabelAnnotation, geneLableFont, maxLane};

