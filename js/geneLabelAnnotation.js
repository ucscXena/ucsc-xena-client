'use strict';

var React = require('react');
import PureComponent from './PureComponent';

var geneLableFont = 12;
var maxLane = 5;

class GeneLabel extends PureComponent {
	render () {
		var {left, bottom, textWidth, textAlign, text, color, fontWeight} = this.props;

		return (
			<div style={{
					left: left,
					bottom: bottom,
					position: 'absolute',
					width: textWidth,
					textAlign: textAlign,
					overflow: 'hidden',
					fontSize: geneLableFont}}>
				<label style = {{color: color, fontWeight: fontWeight}}>
					{text}
				</label>
			</div>);
	}
}

class GeneLabelAnnotation extends PureComponent {
	render() {
		var {width, height, list, subColumnIndex} = this.props;

		var	subColWidth = width / list.length,
			aveSize = subColumnIndex.aveSize,
			laneNum = Math.ceil(list.length / (width / aveSize)),
			laneHeight = height / laneNum;

		var items = laneNum > maxLane ? null : list.map((text, index) => { // display at most 5 lanes
			var left = subColWidth * index,
				textAlign = list.length === 1 ? 'center' : 'left',
				bottom = laneHeight * (index % laneNum),
				textWidth = width - left,
				color = subColumnIndex && index === subColumnIndex.index && list.length !== 1 ? 'red' : 'black',
				fontWeight = subColumnIndex && index === subColumnIndex.index && list.length !== 1 ? 'bold' : 'normal';

			return (
				<GeneLabel
					key = {index}
					left = {left}
					bottom = {bottom}
					textWidth = {textWidth}
					textAlign = {textAlign}
					text = {text}
					color = {color}
					fontWeight = {fontWeight}
					/>);
		});

		return (
			<div style={{width: width, height: height}}>
				{items}
			</div>
		);
	}
}

module.exports = {GeneLabelAnnotation, geneLableFont, maxLane};

