
import * as _ from './underscore_ext.js';
import Rx from './rx';
import * as widgets from './columnWidgets.js';
import * as util from './util.js';
import PureComponent from './PureComponent';
import React from 'react';
import CanvasDrawing from './CanvasDrawing.js';
import { rxEvents } from './react-utils.js';
import { drawSamples } from './drawSamples.js';

//
// Tooltip
//

// We're getting events with coords < 0. Not sure if this
// is a side-effect of the react event system. This will
// restrict values to the given range.
function bounded(min, max, x) {
	return x < min ? min : (x > max ? max : x);
}

function tooltip(heatmap, sampleFormat, codes, width, zoom, samples, ev) {
	var coord = util.eventOffset(ev),
		sampleIndex = bounded(0, samples.length, Math.floor((coord.y * zoom.count / zoom.height) + zoom.index)),
		sampleID = samples[sampleIndex];

	var val = _.getIn(heatmap, [0, sampleID]),
		code = _.get(codes, val, 'NA');

	return {
		sampleID: sampleFormat(sampleID),
		rows: [[['labelValue', 'sample', code]]]
	};
}

//
// plot rendering
//
class SamplesColumn extends PureComponent {
	static displayName = 'Samples';
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = events.mouseover.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.flatMap(() => {
				return events.mousemove
					.takeUntil(events.mouseout)
					.map(ev => ({
						data: this.tooltip(ev)
					})) // look up current data
					.concat(Rx.Observable.of({}));
			}).subscribe(this.props.tooltip);
	}

	componentWillUnmount() {
		this.ttevents.unsubscribe();
	}

	tooltip = (ev) => {
		var {samples, data, column, zoom, sampleFormat} = this.props,
			codes = _.get(data, 'codes'),
			{heatmap, width} = column;
		return tooltip(heatmap, sampleFormat, codes, width, zoom, samples, ev);
	};

	// To reduce this set of properties, we could
	//    - Drop data & move codes into the 'display' obj, outside of data
	// Might also want to copy fields into 'display', so we can drop req probes
	render() {
		var {data, samples, column, zoom} = this.props,
			{heatmap} = column,
			codes = _.get(data, 'codes');
		return (
			<CanvasDrawing
					ref='plot'
					draw={drawSamples}
					wrapperProps={{
						className: 'Tooltip-target',
						onMouseMove: this.on.mousemove,
						onMouseOut: this.on.mouseout,
						onMouseOver: this.on.mouseover,
						onClick: this.props.onClick
					}}
					codes={codes}
					width={_.get(column, 'width')}
					samples={samples}
					zoom={zoom}
					heatmapData={heatmap}/>);
	}
}

var getColumn = props => <SamplesColumn {...props} />;

widgets.column.add("samples", getColumn);

var getLegend = () => null;

widgets.legend.add('samples', getLegend);
