/*jslint nomen:true, browser: true */
/*global define: false */

define(['stub', 'haml!haml/columnUi', 'haml!haml/columnUiSelect', 'haml!haml/tupleDisplay', 'colorBar', 'columnMenu', 'config', 'crosshairs', 'defaultTextInput', 'defer', 'kmPlot', 'tooltip', 'util', 'lib/d3', 'jquery', 'lib/select2', 'lib/underscore', 'xenaQuery', 'rx'
	// non-object dependenciies
	], function (stub, template, selectTemplate, tupleTemplate, colorBar, columnMenu, config, crosshairs, defaultTextInput, defer, kmPlot, tooltip, util, d3, $, select2, _, xenaQuery, Rx) {
	'use strict';

	function columnExists(uuid, state) {
		return !!_.get_in(state, ['column_rendering', uuid]);
	}

	var APPLY = true,
		STATIC_URL = config.STATIC_URL,
		moveImg = STATIC_URL + 'heatmap-cavm/images/moveHorizontal.png',
		menuImg = STATIC_URL + 'heatmap-cavm/images/menu.png',
		each = _.each,
		filter = _.filter,
		find = _.find,
		map = _.map,
		reduce = _.reduce,
		toNumber = _.toNumber,
		uniqueId = _.uniqueId,
		sFeatures = { // TODO for demo
			impact: 'impact', // shorttitle ?
			DNA_AF: 'DNA allele frequency',
			RNA_AF: 'RNA allele frequency'
		},
		//dsTitles = {}, // TODO for demo
		/*
		defTitles = {
			cna: 'copy number',
			DNAMethylation: 'DNA methylation',
			geneExp: 'gene expression',
			RNAseqExp: 'RNA sequence expression',
			arrayExp: 'array expression',
			somaticMutation: 'somatic mutation',
			mutationVector: 'mutation vector',
			protein: 'protein',
			clinical: 'clinical feature'
		},
		*/
		widgets = {},
		aWidget;
	aWidget = {
		// this is invoked from columnMenu.js: remove menu function
		destroy: function () {
			this.subs.dispose();
			this.$el.remove();
			this.crosshairs.destroy();
			// TODO clean up subscriptions, subWidgets, like exonRefGene, mutationVector
			kmPlot.destroy(this.id);
			delete widgets[this.id];
			$('.spreadsheet').resize();
		},

		mouseenterLeave: function (e) {
			var $hoverShow = this.$el.find('.hoverShow'),
				$hoverChange = this.$el.find('.hoverChange');
			if (e.type === 'mouseenter') {
				$hoverShow.removeClass('recede');
				$hoverChange.removeClass('recede');
			} else {
				$hoverShow.addClass('recede');
				$hoverChange.addClass('recede');
				$hoverShow.blur();
			}
		},

		drawLegend: function (colors, labels, align, ellipsis, klass) {
			var label = '';
			if ($('.columnUi').index(this.$el) === 0) {
				label = 'Legend';
			}
			this.$colorBarLabel
				.val(label)
				.addClass(klass);
			labels.reverse();
			this.$colorBarEllipsis.text(ellipsis);
			colorBar.create(this.id, {
				$prevRow: this.$colorBarLabelRow,
				colors: colors.reverse().concat('#808080'),
				labels: labels.concat('NA'),
				tooltips: labels.concat('No data'),
				align: align,
				klass: klass
			});
		},

		setWidth: function (width) {
			this.$moveHandle.width(width - this.$more.width() - 10);
		},

		reRender: function (options) {
			var titlePath = {
					'user': ['column_rendering', this.id, 'columnLabel', 'user'],
					'default': ['column_rendering', this.id, 'columnLabel', 'default']
				},
				fieldPath = {
					'user': ['column_rendering', this.id, 'fieldLabel', 'user'],
					'default': ['column_rendering', this.id, 'fieldLabel', 'default']
				};
			this.ws = options.ws;
			defaultTextInput.create({
				$el: this.$columnTitle,
				state: this.state.refine(titlePath),
				cursor: options.cursor.refine(titlePath),
				id: 'title'
			});
			defaultTextInput.create({
				$el: this.$field,
				state: this.state.refine(fieldPath),
				cursor: options.cursor.refine(fieldPath),
				id: 'field'
			});
		},

		firstRender: function (options) {
			var self = this,
				$anchor = $(options.ws.el);
			this.sheetWrap = options.sheetWrap;
			this.ws = options.ws;
			this.$el = $(template({
				features: undefined,
				moveImg: moveImg,
				menuImg: menuImg
			}));
			$anchor.append(this.$el);

			// adjust to default column dimensions
			this.$el.parent().css('margin-left', this.horizontalMargin);
			this.$el.parent().css('margin-right', this.horizontalMargin);
			this.$el.find('.sparsePad').height(this.sparsePad);
			this.$el.find('.headerPlot').height(this.headerPlotHeight);

			// cache jquery objects for active DOM elements
			this.cache = ['moveHandle', 'more', 'titleRow', 'columnTitle', 'fieldRow', 'field', 'headerPlot', 'sparsePad', 'samplePlot', 'colorBarLabelRow', 'colorBarLabel', 'colorBarEllipsis'];
			_(self).extend(_(self.cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));

			this.columnMenu = columnMenu.create(this.id, {
				anchor: this.$more,
				columnUi: this,
				cursor: this.cursor,
				state: this.state,
				deleteColumn: options.deleteColumn,
				sheetWrap: this.sheetWrap
			});
			this.$el // TODO use rx handlers?
				.on('mouseenter mouseleave', this.mouseenterLeave);

			setTimeout(function () {
				self.setWidth(options.ws.column.width);
			}, 500);
			this.subs.add(this.state.refine({ 'width': ['column_rendering', this.id, 'width'] })
				.subscribe(function (s) {
					self.setWidth(s.width);
				}));

			this.reRender(options);
		},

		render: function (options) {
			if (this.$el) {
				this.reRender(options);
			} else {
				this.firstRender(options);
			}
		},

		kmPlotVisibility: function () {
			var myKmState,
				self = this;

			// when sources change, redraw the datasets,
			// retaining the selection if it's still an option
			this.subs.add(this.state.distinctUntilChanged(function (s) {
				return s.column_rendering[self.id].kmPlot;
			})
				.subscribe(function (s) {
					var kmState = s.column_rendering[self.id].kmPlot;
					if (myKmState && !kmState) {
						myKmState = kmState;
						kmPlot.destroy(self.id);
					}
					if (!myKmState && kmState) {
						myKmState = kmState;
						kmPlot.show(self.id, {
							cursor: self.cursor.refine({ 'kmPlot': ['column_rendering', self.id, 'kmPlot'] }),
							columnUi: self
						});
					}
				}));
		},

		initialize: function (options) {
			_.bindAll.apply(_, [this].concat(_.functions(this)));

			this.subs = new Rx.CompositeDisposable();
			this.sheetWrap = options.sheetWrap;
			this.cursor = options.cursor;
			this.state = options.state
				.takeWhile(_.partial(columnExists, this.id))
				.finally(this.destroy)
				.share();
			this.sparsePad = options.sparsePad;
			this.headerPlotHeight = options.headerPlotHeight;
			this.horizontalMargin = options.horizontalMargin.toString() + 'px';

			if (options.ws) {
				this.render(options);
			}
			this.crosshairs = crosshairs.create(this.id, { $anchor: this.$samplePlot });

			this.subs.add(this.$samplePlot.onAsObservable('click')
				.filter(function (ev) {
					return ev.altKey === true;
				})
				.subscribe(tooltip.toggleFreeze));

			this.kmPlotVisibility();
		}
	};

	function create(id, options) {
		var w = Object.create(aWidget);
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		show: function (id, options) {
			var widget = widgets[id];
			if (widget) {
				widget.render(options);
			} else {
				widget = widgets[id] = create(id, options);
			}
			return widget;
		}
	};
});
