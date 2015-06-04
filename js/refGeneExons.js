/*jslint nomen:true, browser: true */
/*global define: false */

define(['crosshairs', 'tooltip', 'util', 'd3', 'jquery', 'select2', 'underscore', 'exonLayout', 'zoom', 'rx',
	   'static-interval-tree', 'vgcanvas',
	// non-object dependencies
	], function (crosshairs, tooltip, util, d3, $, select2, _, exonLayout, zoom, Rx, intervalTree, vgcanvas) {
	'use strict';

	var {zoomIn, zoomOut} = zoom;
	var {matches, index} = intervalTree;

	// annotate an interval with cds status
	var inCds = ({cdsStart, cdsEnd}, intvl) =>
		_.assoc(intvl, 'inCds', intvl.start <= cdsEnd && cdsStart <= intvl.end);

	// split an interval at pos if it overlaps
	var splitOnPos = (pos, i) => (i.start < pos && pos <= i.end) ?
			[_.assoc(i, 'end', pos - 1), _.assoc(i, 'start', pos)] : i;

	// create interval record
	var toIntvl = (start, end, i) => ({start: start, end: end, i: i});

	// Create drawing intervals, by spliting exons on cds bounds, and annotating if each
	// resulting region is in the cds. Each region is also annotated by its index in the
	// list of exons, so we can alternate colors when rendering.
	//
	// findIntervals(gene :: {cdsStart :: int, cdsEnd :: int, exonStarts :: [int, ...], exonEnds :: [int, ...]})
	//     :: [{start :: int, end :: int, i :: int, inCds :: boolean}, ...]
	function findIntervals(gene) {
		var {cdsStart, cdsEnd, exonStarts, exonEnds} = gene;

		return _.map(_.flatmap(_.flatmap(_.zip(exonStarts, exonEnds),
										([s, e], i) => splitOnPos(cdsStart, toIntvl(s, e, i))),
								i => splitOnPos(cdsEnd + 1, i)),
					i => inCds(gene, i));
	}

	var shade1 = '#cccccc',
		shade2 = '#999999',
		annotation = {
			utr: {
				y: 2,
				h: 8
			},
			cds: {
				y: 0,
				h: 12
			}
		},
		widgets = {},
		refGeneWidget = {

			destroy: function () {
				this.crosshairs.destroy();
				$(this.vg.element()).remove();
				this.subs.dispose();
				delete widgets[this.id];
			},

			getGeneInfo: function () {
				return {
					name: this.data.name2,
					scaleX: this.scaleX,
					txStart: this.data.txStart,
					txEnd: this.data.txEnd,
					strand: this.data.strand
				};
			},

			render: function (vg, intervals, indx, layout, offset) {
				var ctx = vg.context();
				var {screen, chrom, reversed} = layout;
				_.each(chrom, ([start, end], i) => {
					var [sstart, send] = screen[i];
					var flop = reversed ? -1 : 1;

					// XXX set clip here to support views with fractional exons
					ctx.save();
					ctx.translate(reversed ? send : sstart, 0);
					ctx.scale(flop * (send - sstart) / (end - start + 1), 1);
					ctx.translate(- start - flop * offset, 0);
					var nodes = matches(indx, {start: start, end: end});
					_.each(nodes, ({i, start, end, inCds}) => {
						var {y, h} = annotation[inCds ? 'cds' : 'utr'];
						ctx.fillStyle = i % 2 === 0 ? shade2 : shade1;
						ctx.fillRect(start, y, end - start, h);
					});
					ctx.restore();
				});
				ctx.font = "12px Verdana";
				ctx.strokeText("5'", 5, this.canvasHeight - 2);
				ctx.strokeText("3'", this.canvasWidth - 15, this.canvasHeight - 2);
			},

			initialize: function (options) {
				_.bindAll.apply(_, [this].concat(_.functions(this)));

				this.codingHeight = options.refHeight;
				this.canvasWidth = options.width;
				this.radius = options.radius;
				this.drawWidth = this.canvasWidth - this.radius * 2;
				this.canvasHeight = this.codingHeight;

				this.crosshairs = crosshairs.create('exonRefGene-' + this.id, {
					$anchor: $(options.plotAnchor)
				});

				var {layout, data, zoom: {index: offset}} = options;
				var {baseLen} = layout;

				var intervals = findIntervals(data.gene);
				var indx = index(intervals);
				var vg = vgcanvas(this.canvasWidth, this.canvasHeight);
				$(options.plotAnchor).append(vg.element());
				this.render(vg, intervals, indx, layout, offset || 0);
				this.vg = vg;

				this.subs = new Rx.CompositeDisposable();
				this.subs.add($(vg.element()).onAsObservable('dblclick')
					.subscribe(ev => {
						var total = baseLen;
						var pos = (ev.pageX - $(ev.currentTarget).offset().left) /
							$(ev.currentTarget).width();
						ev.stopPropagation();
						options.cursor.update(s =>
							_.update_in(s, ['column', 'zoom'], zoom => {
								var {index, len} = zoom || {index: 0, len: total};
								var [nindex, nlen] = zoomIn(index, len, total, pos);
								return {index: nindex, len: nlen};
							}));
					}));

				this.subs.add($(vg.element()).onAsObservable('click').filter(ev => ev.shiftKey)
					.subscribe(ev => {
						var total = baseLen;
						ev.stopPropagation();
						options.cursor.update(s =>
							_.update_in(s, ['column', 'zoom'], zoom => {
								var {index, len} = zoom || {index: 0, len: total};
								var [nindex, nlen] = zoomOut(index, len, total);
								return {index: nindex, len: nlen};
							}));
					}));
			}
		};

	function create(id, options) {
		var w = Object.create(refGeneWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		findIntervals: findIntervals,
		show: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
			widgets[id] = create(id, options);
			return widgets[id];
		},

		get: function (id) {
			return widgets[id];
		}
	};
});
