/*globals require: false, module: false, window: false */

'use strict';

var React = require('react');
var Rx = require('rx');
var Col = require('react-bootstrap/lib/Col');
var Row = require('react-bootstrap/lib/Row');
var Button = require('react-bootstrap/lib/Button');
var Label = require('react-bootstrap/lib/Label');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var SplitButton = require('react-bootstrap/lib/SplitButton');
var ColumnEdit = require('./columnEdit');
var _ = require('./underscore_ext');
var L = require('./lenses/lens');
require('./Columns.css');
require('./YAxisLabel.css');

var YAxisLabel = React.createClass({
    render: function () {
		var height = _.getIn(this.props, ['zoom', 'height']),
			index = _.getIn(this.props, ['zoom', 'index']) || 0,
			count = _.getIn(this.props, ['zoom', 'count']) || 0,
			length = _.getIn(this.props, ['samples', 'length']) || 0,
			fraction = count === length ? '' :
				`, showing ${ index } - ${ index + count - 1 }`,
			 text = `Samples (N=${ length }) ${ fraction }`;

        return (
			<div style={{height: height}} className="YAxisWrapper">
				<p style={{width: height}} className="YAxisLabel">{text}</p>
			</div>
		);
    }
});

var Column = React.createClass({
	render: function () {
		var {id, left, onMouseDown} = this.props;
		var {zoom: {height}, columnRendering} = L.view(this.props.lens),
			{width, columnLabel, fieldLabel} = columnRendering[id],
			moveIcon = <span
				onMouseDown={onMouseDown}
				className="glyphicon glyphicon-resize-horizontal"
				aria-hidden="true">
				</span>;
		return (
			<div className='Column' style={{width: width, left: left}}>
				<SplitButton className='handle' title={moveIcon} bsSize='xsmall'>
					<MenuItem eventKey='remove'>Remove</MenuItem>
				</SplitButton>
				<br/>
				<Label>{columnLabel.user}</Label>
				<br/>
				<Label>{fieldLabel.user}</Label>
				<br/>
				<div style={{height: height}}> {/* data */}
				</div>
			</div>
		);
	}
});

function initialPositions(cols) {
	return _.object(_.map(cols, id => ([id, 0])));
}

function leftWidth(rect) {
	return {
		left: rect.left,
		width: rect.right - rect.left
	};
}

// If right edge crosses middle of next element, move next element to left.
// If left edge crosses middle of prev element, move prev element to right.
//
// Each element can only move as much as the width of the dragged element,
// And only moves if the dragged edge has crossed the midpoint of the element.
// So:
// For all those before N, if left edge has crossed midpoint, add width to position, else 0.
// For all thos after N, if right edge has crossed midpoint, subtract with to position, else 0.
// left1             left2
// |   width1   |    |   width2  |
//
// Dragging left1 to the right
// We cross the left edge when left1 + offset1 + width1 >= left2.
// We cross the midpoint when left1 + offset1 + width1 >= left2 + width2 / 2.
// At that point, we set offset2 to left1 - left2. <-- this offset is the same for all shifts.
//
// Dragging left2 to the left
// We cross the right edge when left2 + offset2 <= left1 + width1.
// We cross the midpoint when left2 + offset2 <= left1 + width1 / 2.
// At that point, we set offset1 to left2 - left1.   <-- this offset is the same for all shifts.

var Columns = React.createClass({
	componentWillMount: function () {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.selectMany(([id, md]) => {
			var {columnOrder} = L.view(this.props.lens);

            // calculate offsets when mouse down
			var startX = md.clientX;
			var positions = _.map(columnOrder,
								  id => leftWidth(this.refs[id].getDOMNode().getBoundingClientRect()));
			var N = positions.length;
			var index = _.indexOf(columnOrder, id);
			var target = positions[index];
			var max = positions[N - 1].left - target.left - target.width + positions[N - 1].width;
			var min = positions[0].left - target.left;
			var newPos;

			// Calculate delta with mousemove until mouseup
			return Rx.DOM.fromEvent(window, 'mousemove').map(function (mm) {
				mm.preventDefault();

				var shift, edge;
				var dragLeft = mm.clientX - startX;
				dragLeft = dragLeft < min ? min : (dragLeft > max ? max : dragLeft);

				if (dragLeft < 0) {              // dragging left
					shift = target.left - positions[index - 1].left ;
					edge = target.left + dragLeft;
					newPos = _.map(_.first(positions, index),
								   ({left, width}, i) => edge < left + width / 2 ? shift : 0).concat(
						[dragLeft],
						_.map(_.last(positions, N - 1 - index), () => 0));
				}  else if (dragLeft > 0) {      // dragging right
					shift = target.left - positions[index + 1].left;
					edge = target.left + dragLeft + target.width;
					newPos = _.map(_.first(positions, index), () => 0).concat(
						[dragLeft],
						_.map(_.last(positions, N - 1 - index),
							  ({left, width}, i) => edge >= left + width / 2 ? shift : 0));
				} else {
					newPos = _.map(positions, () => 0);
				}

				return _.object(columnOrder, newPos);
			}).takeUntil(Rx.DOM.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => {
				var indexOrder = _.range(columnOrder.length)
					.sort((i, j) => positions[i].left + newPos[i] > positions[j].left + newPos[j]),
					newOrder = _.map(indexOrder, i => columnOrder[i]);
				return Rx.Observable.return({columnOrder: newOrder});
			}));
        });

        // Update position
		this.subscription = mousedrag.subscribe(pos => {
			if (_.has(pos, 'columnOrder')) {
				L.over(this.props.lens, s => _.assoc(s, 'columnOrder', pos.columnOrder));
			} else {
				this.setState({pos: pos});
			}
        });

		this.sortStart =  ev => mousedown.onNext(ev);
	},

	getInitialState: function () {
		return {pos: initialPositions(L.view(this.props.lens).columnOrder)};
	},

	componentWillReceiveProps: function () {
		this.setState({pos: initialPositions(L.view(this.props.lens).columnOrder)});
	},

	componentWillUnmount: function () {
		this.subscription.dispose();
	},

	render: function () {
		var {height, columnOrder} = L.view(this.props.lens);
		var editor = _.getIn(this.state, ['columnEdit']) ?
			<ColumnEdit
				{...this.props}
				onRequestHide={() => this.setState({columnEdit: false})}
			/> : '';
		var columns = _.map(columnOrder, id =>
							<Column
								onMouseDown={ev => this.sortStart([id, ev])}
								ref={id}
								left={this.state.pos[id]}
								key={id}
								id={id}
								lens={this.props.lens}/>);
        return (
			<div className="Columns">
				{columns}
				<div
					style={{height: height}}
					className='addColumn Column'>

					<Button
						onClick={() => this.setState({columnEdit: true})}
						className='Column-add-button'
						title='Add a column'>
						+
					</Button>
				</div>
				<div className='crosshairH crosshair' />
				{editor}
			</div>
		);
    }
});


var Spreadsheet = React.createClass({
	render: function () {
		var l = L.view(this.props.lens);
		return (
			<Row>
				<Col md={1}>
					<YAxisLabel
						samples={this.props.samples}
						zoom={l.zoom}
					/>
				</Col>
				<Col md={11}><Columns {...this.props}/></Col>
			</Row>
		);
	}
});

module.exports = Spreadsheet;

//define(['underscore_ext',
//		'jquery',
//		'rx',
//		'columnWidgets',
//		'rx.binding',
//		'rx.async', // needed?
//		'rx-jquery',
//		'rx-dom',
//		'rx.ext'], function (_, $, Rx, widgets) {
//
//	"use strict";
//
//	// XXX If we created utility functions for updating the column list/table,
//	// we could have them maintain an index. That would resolve the problem
//	// of wanting relational data model, but also needing indexes. The add and
//	// remove methods would simply add or remove from the index. The sort method
//	// would rebuild the index. How would loading from history/session work?
//	function reorderColumns(order, state) {
//		return _.assoc(state, "column_order", order);
//	}
//
//	function setWidth(uuid, width, state) {
//		return _.assocIn(state, ['column_rendering', uuid, 'width'], width);
//	}
//
//	function zoomIn(pos, state) {
//		var count = Math.max(1, Math.floor(state.zoomCount / 3)),
//			maxIndex = state.samples.length - count,
//			index = Math.max(0, Math.min(Math.round(state.zoomIndex + pos * state.zoomCount - count / 2), maxIndex));
//
//		return _.assoc(state, 'zoomCount', count, 'zoomIndex', index);
//	}
//
//	function zoomOut(state) {
//		var count = Math.min(state.samples.length, Math.round(state.zoomCount * 3)),
//			maxIndex = state.samples.length - count,
//			index = Math.max(0, Math.min(Math.round(state.zoomIndex + (state.zoomCount - count) / 2), maxIndex));
//
//		return _.assoc(state, 'zoomCount', count, 'zoomIndex', index);
//	}
//
//	function cmpString(s1, s2) {
//		if (s1 > s2) {
//			return 1;
//		} else if (s2 > s1) {
//			return -1;
//		}
//		return 0;
//	}
//
//	function spreadsheetWidget(state, cursor, parent, wrapperIn) {
//		// XXX why is replay necessary? Seems to be so we get the sessionStorage, but is this
//		// really the right way to get it??
//		var curr = [],    // current uuids in order
//			cels = {},    // current divs by uuid
//			children = {}, // child disposables
//			el = $('<div></div>'),
//			subs = new Rx.CompositeDisposable(),
//            wrapper = (id, ws) => wrapperIn(state, cursor, id, ws); // XXX drop this when refactoring the relationship between sheetWrap & spreadsheet
//		state = state.shareReplay(1); // XXX move this to columnModels? So widgets can get latest state?
//		el.sortable({
//			axis: 'x',
//			handle: '.moveHandle'
//		});
//
//		// jquery-ui horizontal sortable bug
//		// https://github.com/angular-ui/ui-sortable/issues/19
//		el.data('ui-sortable').floating = true;
//
//		parent.append(el);
//
//		// XXX It's unclear to me whether we leak this handler when
//		// the DOM element is destroyed. onAsObservable doesn't appear
//		// to have any special handling. Is any needed?
//		subs.add(el.onAsObservable("sortstop")
//			.subscribe(function () {
//				var allcols = el.children();
//				curr = _.map(allcols, function (e) { return e.id; });
//				cels = _.object(curr, allcols);
//				cursor.update(_.partial(reorderColumns, curr));
//			})
//		);
//
//		subs.add(el.onAsObservable("resizestop")
//			.subscribe(function (ev) {
//				ev.stopPropagation();
//				cursor.update(
//					_.partial(setWidth,
//						ev.additionalArguments[0].element.prop('id'),
//						ev.additionalArguments[0].size.width)
//				);
//			})
//		);
//
//		subs.add(el.onAsObservable("dblclick", '.samplePlot').subscribe(function (ev) {
//			var pos = (ev.pageY - $(ev.currentTarget).offset().top) / $(ev.currentTarget).height();
//			cursor.update(_.partial(zoomIn, pos));
//		}));
//
//		subs.add(el.onAsObservable("click").filter(function (ev) { return ev.shiftKey; }).subscribe(function (ev) {
//			cursor.update(zoomOut);
//		}));
//
//		var widgetStates = state.select(function (s) {
//			return _.fmap(s.column_rendering, function (col, uuid) {
//				var dsID = _.getIn(s, ['column_rendering', uuid, 'dsID']);
//				return _.pluckPaths({
//					cohort: ['cohort'],
//					height: ['height'], // XXX refactor vertical position info into an object
//					zoomIndex: ['zoomIndex'],
//					zoomCount: ['zoomCount'],
//					samples: ['samples'],
//					_datasets: ['_datasets'],
//					_column: ['_column', uuid],
//					column: ['column_rendering', uuid],
//					vizSettings: ['vizSettings', dsID]
//				}, s);
//			});
//		}).share();
//
//		// requests
//		// renderers need this to draw. data needs this to update queries.
//		// per-widget, mapping of ids->queries
//		// {
//		//	'123-234': {'CUL1': {'grotto://(CUL1)': {post_data}}, 'avg': {'grotto://(avg CUL2)': {post_data}}' }
//		// }
//
//		// XXX We only need this to look up the data. Can we combine
//		// this with widgetStates, above? The scanPrevious gives us a
//		// cache. Also, we need reqs to do the data fetchs, just below.
//
//		var reqs = widgetStates.scanPrevious({}, {}, function (acc, prevState, state) {
//			return _.fmap(state, function (c, uuid) {
//				return widgets.fetch(c, prevState[uuid], acc[uuid]);
//			});
//		}).share();
//
//		// mapping of queries to data
//		// are samples represented here somewhere? We index them by sample?
//		// {
//		//  'grotto://(CUL1)': [1,2,3], 'grotto://(avg CUL2)': [4,5,6]
//		// }
//
//		// This recomputes a lot. Can we use a scan or something?
//		// Does fmap leak streams if the uuid stays the same but
//		// the query changes?
//		subs.add(reqs.select(function (r) {
//			return _.reduce(r, function (acc, col_reqs, uuid) {
//				_.each(col_reqs, function (req) {
//					acc[req.id] = req.query;
//				});
//				return acc;
//			}, {});
//		}).fmap().subscribe(function (d) {
//			// inject the async results into app state
//			cursor.update(function (state) {
//				return _.assoc(state, 'data', d);
//			});
//		}));
//
//		// data, per-widget
//		var data = state.pluck('data').zip(reqs, function (data, reqs) {
//			return _.fmap(reqs, function (col_reqs, uuid) {
//				return _.fmap(col_reqs, function (req) {
//					return (data && data[req.id]) || {};
//				});
//			});
//		});
//
//		var wsData = widgetStates.zip(data, function (ws, data) {
//			return _.fmap(ws, function (ws, uuid) {
//				return _.assoc(ws, 'data', data[uuid]);
//			});
//		}).share();
//
//		// cmp functions
//		// {
//		//   '123-234': fn, ...
//		// }
//		var cmpfns = wsData.scanPrevious({}, {}, function (acc, prevState, state) {
//			return _.fmap(state, function (c, uuid) {
//				return widgets.cmp(c, prevState[uuid], acc[uuid]);
//			});
//		});
//
//		// sort
//		// sorted samples
//		// [ {cohort: 'a', sample: '1'}, {cohort: 'b', sample: '1'} ]
//
//		var sort = Rx.Observable.zipArray(
//			state.pluck('samples'),
//			state.pluck('column_order'),
//			cmpfns
//		).selectMemoize1(_.apply(function (samples, order, cmpfns) {
//			function cmp(s1, s2) {
//				var r = 0;
//				_.find(order, function (uuid) {
//					r = cmpfns[uuid](s1, s2);
//					return r !== 0;
//				});
//
//				return (r === 0) ? cmpString(s1, s2) : r; // XXX add cohort as well
//			}
//			return _.clone(samples).sort(cmp);
//		}));
//
//		// XXX refactor the DOM update pattern into a utility function
//		var domUpdater = Rx.Observable.zipArray(state.pluck('column_order'), widgetStates)
//			.doAction(_.apply(function (order, ws) {
//				var colupdate = !_.isEqual(curr, order),
//					delcols = _.difference(curr, order),
//					addcols = _.difference(order, curr);
//
//				_.each(delcols, function (uuid) {
//					subs.remove(children[uuid]);
//					delete children[uuid];
//					$(cels[uuid]).remove();
//					delete cels[uuid];
//				});
//
//				_.each(addcols, function (uuid) {
//					cels[uuid] = $('<div></div>')
//						.addClass('spreadsheet-column')
//						.prop('id', uuid)
//						.resizable({handles: 'e'})[0];
//
//					children[uuid] = new Rx.SerialDisposable();
//
//					subs.add(children[uuid]);
//				});
//
//				// XXX should cache the DOM size info so we don't have to
//				// query it.
//				_.each(ws, function (c, uuid) {
//					var cel = $(cels[uuid]);
//					if (cel.width() !== c.column.width) {
//						cel.width(c.column.width);
//					}
//				});
//
//				if (colupdate) { // correct the display order
//					_.each(order, function (uuid) {
//						$(cels[uuid]).detach();
//					});
//					_.each(order, function (uuid) {
//						el.append(cels[uuid]);
//					});
//					curr = order;
//
//					el.sortable('refresh');
//				}
//		}));
//
//		// assoc in the sort for each column,
//		// and create a sequence of [old, new] state.
//		var wsSort = wsData.zip(sort,
//			function (widgetStates, sort) {
//				return _.fmap(widgetStates, function (ws, uuid) {
//					return _.assoc(ws, "sort", sort);
//				});
//			}
//		).startWith({}).bufferWithCount(2, 1);
//
//
//		// Draw columns.
//		// Using _.identity to drop 2nd arg, which is just for side-effects.
//		subs.add(wsSort.zip(domUpdater, _.identity).subscribe(
//			_.apply(function (prevState, state) {
//				_.each(state, function (ws, uuid) {
//					var wsdom = _.assoc(ws, "disp", children[uuid], "el", cels[uuid], "wrapper", wrapper),
//					    prevdom = _.assoc(prevState[uuid] || {}, "disp", children[uuid],
//								  "el", cels[uuid], "wrapper", wrapper);
//					widgets.render(wsdom, prevdom, null);
//				});
//				return state;
//			}),
//			function (err) { console.log(err.message, err.stack); console.log(arguments); },
//			function () {
//				subs.dispose();
//				el.remove();
//			}
//		));
//
//		return subs;
//	}
//
//	return spreadsheetWidget;
//});
