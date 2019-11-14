
var _ = require('./underscore_ext');
var Rx = require('./rx');
var widgets = require('./columnWidgets');
var util = require('./util');
import PureComponent from './PureComponent';
var React = require('react');
var CanvasDrawing = require('./CanvasDrawing');
var {rxEvents} = require('./react-utils');
var {drawSamples} = require('./drawSamples');
var config = require('./config');

// Since we don't set module.exports, but instead register ourselves
// with columWidgets, react-hot-loader can't handle the updates automatically.
// Accept hot loading here.
if (module.hot) {
	module.hot.accept();
}

// Since there are multiple components in the file we have to use makeHot
// explicitly.
function hotOrNot(component) {
	return module.makeHot ? module.makeHot(component) : component;
}

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
		rows: [[['labelValue', config.singlecell ? 'cell' : 'sample', code]]]
	};
}

//
// plot rendering
//

var SamplesColumn = hotOrNot(//
// plot rendering
//

class extends PureComponent {
	static displayName = 'Samples';
	componentWillMount() {
		var events = rxEvents(this, 'mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = events.mouseover.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.flatMap(() => {
				return events.mousemove
					.takeUntil(events.mouseout)
					.map(ev => ({
						data: this.tooltip(ev),
						open: true
					})) // look up current data
					.concat(Rx.Observable.of({open: false}));
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
});

var getColumn = props => <SamplesColumn {...props} />;

widgets.column.add("samples", getColumn);

var getLegend = () => null;

widgets.legend.add('samples', getLegend);
