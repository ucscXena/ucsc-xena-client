
import React from 'react';
import PureComponent from './PureComponent';
import { getIn } from './underscore_ext.js';

var geneLableFont = 12;
var maxLane = 5;

class GeneLabel extends PureComponent {
	render () {
		var {left, bottom, textWidth, textAlign, text, color, fontWeight, wordWrap} = this.props;

		return (
			<div style={{
					left: left,
					bottom: bottom,
					position: 'absolute',
					width: textWidth,
					textAlign: textAlign,
					wordWrap: wordWrap,
					overflow: 'hidden',
					fontSize: geneLableFont}}>
				<label style = {{color: color, fontWeight: fontWeight}}>
					{text}
				</label>
			</div>);
	}
}

class GeneLabelAnnotation extends PureComponent {
	state = {
		fieldIndex: -1
	};
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		this.sub = this.props.tooltip.subscribe(ev => {
			this.setState({
				fieldIndex: getIn(ev, ['data', 'fieldIndex'], -1)
			});
		});
	}
	componentWillUnmount() {
		this.sub.unsubscribe();
	}
	render() {
		var {width, height, list, subColumnIndex} = this.props,
			{fieldIndex} = this.state;

		var	subColWidth = width / list.length,
			aveSize = subColumnIndex.aveSize,
			textAlign = list.length === 1 ? 'center' : 'left',
			wordWrap = list.length === 1 ? 'break-word' : 'normal',
			laneNum = list.length === 1 ?  1 : Math.ceil(list.length / (width / aveSize)),
			laneHeight = height / laneNum;

		var items = laneNum > maxLane ? null : list.map((text, index) => { // display at most 5 lanes
			var left = subColWidth * index,
				bottom = laneHeight * (index % laneNum),
				textWidth = width - left,
				color = subColumnIndex && index === fieldIndex && list.length !== 1 ? 'red' : 'black',
				fontWeight = subColumnIndex && index === fieldIndex && list.length !== 1 ? 'bold' : 'normal';

			if (list.length === 1) { // for single probe/gene/signature column, shorten text so that it will not go over vertically due to line wrapping
				text = text.slice(0, subColWidth * maxLane / geneLableFont) +
					(subColWidth * maxLane / geneLableFont < text.length ?  ' ...' : '');
			}

			return (
				<GeneLabel
					key = {index}
					left = {left}
					bottom = {bottom}
					textWidth = {textWidth}
					textAlign = {textAlign}
					text = {text}
					color = {color}
					wordWrap = {wordWrap}
					fontWeight = {fontWeight}/>);
		});

		return (
			<div style={{width: width, height: height}}>
				{items}
			</div>
		);
	}
}

export {GeneLabelAnnotation, geneLableFont, maxLane};

