/*jslint nomen:true, browser: true */
/*global define: false */

define(['haml/columnMenu.haml', 'columnEdit', 'download', 'kmPlot', 'mutationVector', 'Menu', 'jquery', 'underscore', 'xenaQuery', 'heatmapVizSettings'
	// non-object dependencies
	], function (template, columnEdit, download, kmPlot, mutationVector, Menu, $, _, xenaQuery, vizSettings) {
	'use strict';

	function columnDsID(state, id) {
		return state.column_rendering[id].dsID; // XXX use _.getIn!
	}

	var APPLY_BUTTON,
		vizSettingsWidgets = {},
		ColumnMenu = function () {

			this.docClick = function () {
				if (this.firstDocClick) {
					this.firstDocClick = false;
				} else {
					this.destroy();
				}
			};

			this.editClick = function (ev) {
				this.columnUi.columnEdit = columnEdit.show(this.id, {
					columnUi: this.columnUi,
					APPLY_BUTTON: APPLY_BUTTON
				});
			};

			this.duplicateClick = function (ev) {
				this.duplicateColumn(this.id);
			};

			this.aboutClick = function (ev) {
				var column = this.columnUi.ws.column,
					dsID = JSON.parse(column.dsID),
					host= dsID.host,
					dataset = dsID.name,
					url ="/datapages/?dataset="+encodeURIComponent(dataset)+"&host="+encodeURIComponent(host);

				window.open(url);
			};

			this.vizSettingsClick = function (ev) {
				var self = this;
				if (this.$vizSettings.hasClass('disabled')) {
					return;
				}
				this.cursor.update(function (s) {
					return _.assocIn(s, ['_vizSettings', columnDsID(s, self.id), 'open'], true);
				});
			};

			this.kmPlotClick = function (ev) {
				var self = this,
					column = this.columnUi.ws.column;
				if (this.$kmPlot.hasClass('disabled')) {
					return;
				}
				if (column.kmPlot) {
					kmPlot.moveToTop(this.id);
				} else {
					this.cursor.update(function (s) {
						return _.assocIn(s, ['column_rendering', self.id, 'kmPlot'], { geometry: 'default' });
					});
				}
			};

			this.mupitClick = function (ev) {
				mutationVector.mupitClick(this.id);
			};

			this.downloadClick = function (ev) {
				download.create({
					ws: this.columnUi.ws,
					columnUi: this.columnUi,
					$anchor: this.$el
				});
			};

			this.mouseleave = function (ev) {
				this.destroyList();
			};

			this.viewMouseenter = function (ev) {
				this.$el.find('.viewList')
					.show()
					.position({ my: 'left top', at: 'right top', of: this.$el.find('.view') });
			};

			this.viewMouseleave = function (ev) {
				this.$el.find('.viewList').hide();
			};

			this.updateColumn = function (key, val) {
				var id = this.id;
				this.cursor.update(function (state) {
					return _.assocIn(state, ['column_rendering', id, key], val);
				});
			};

			this.detailClick = function (ev) {
				this.updateColumn('dataType', 'geneProbesMatrix');
			};

			this.geneAverageClick = function (ev) {
				this.updateColumn('dataType', 'geneMatrix');
			};

			this.impactClick = function (ev) {
				this.updateColumn('sFeature', 'impact');
			};

			this.dna_vafClick = function (ev) {
				this.updateColumn('sFeature', 'dna_vaf');
			};

			this.rna_vafClick = function (ev) {
				this.updateColumn('sFeature', 'rna_vaf');
			};

			this.removeClick = function (ev) {
				this.deleteColumn(this.id);
			};

			this.anchorClick = function (event, options) {
				if ($(event.target).hasClass('link')) {
					event.stopPropagation();
				} else {
					options.topAdd = -10;
					options.leftAdd = -50;
					this.menuAnchorClick(event, options);
				}
			};

			this.render = function () {
				var column = this.columnUi.ws.column;

				this.menuRender($(template()));
				if (column.dataType === 'mutationVector') {
					this.$el.find('.mupit, .view, .impact, .dna_vaf, .rna_vaf, hr').show();
					this.$el.find('.' + column.sFeature + ' .ui-icon-check').css('opacity', 1);
				} else if (column.dataType === 'geneProbesMatrix') {
					this.$el.find('.view, .detail, .geneAverage, hr').show();
					this.$el.find('.detail .ui-icon-check').css('opacity', 1);
				} else if (column.dataType === 'geneMatrix' && column.fields.length === 1) {
					this.$el.find('.view, .detail, .geneAverage, hr').show();
					this.$el.find('.geneAverage .ui-icon-check').css('opacity', 1);
				}
				this.$vizSettings = this.$el.find('.vizSettings');
				this.$vizSettings.show();
				if (column.type !== 'genomicMatrix') {
					this.$vizSettings.addClass('disabled');
				}

				this.$kmPlot = this.$el.find('.kmPlot');
				this.$kmPlot.show();
				if (!this.columnUi.plotData || (column.dataType !== 'geneProbesMatrix' && column.fields.length > 1)) {
					this.$kmPlot.addClass('disabled');
				}
			};

			this.initialize = function (options) {
				var self = this;
				_.bindAll.apply(_, [this].concat(_.functions(this)));

				APPLY_BUTTON = options.APPLY_BUTTON;
				this.columnUi = options.columnUi;
				this.cursor = options.cursor;
				this.state = options.state;
				this.deleteColumn = options.deleteColumn;
				this.moreItems = options.moreItems;
				this.menuInitialize(options);

				this.state.refine(['_vizSettings', 'vizSettings', 'cohort', 'column_rendering'])
					.distinctUntilChanged(function (s) {
						return _.getIn(s, ['_vizSettings', columnDsID(s, self.id), 'open']);
					}).subscribe(function (s) {
						var dsID = columnDsID(s, self.id),
							open = _.getIn(s, ['_vizSettings', dsID, 'open']),
							vizCursor = self.cursor.refine({
								_vizSettings: ['_vizSettings', dsID],
								vizSettings: ['vizSettings', dsID],
								cohort: ['cohort']
							});
						if (!open && vizSettingsWidgets[dsID]) {
							vizSettingsWidgets[dsID]();
							delete vizSettingsWidgets[dsID];
						} else if (open && !vizSettingsWidgets[dsID]) {
							vizSettingsWidgets[dsID] = vizSettings(vizCursor, {
								_vizSettings: _.getIn(s, ['_vizSettings', dsID]),
								vizSettings: _.getIn(s, ['vizSettings', dsID]),
								cohort: _.getIn(s, ['cohort'])
							}, dsID);
						}
					});

				// bindings
				this.$el // TODO replace with Rx bindings ?
					.on('mouseleave', this.mouseleave)
					.on('click', '.mupit', this.mupitClick)
					.on('mouseenter', '.view', this.viewMouseenter)
					.on('mouseleave', '.view', this.viewMouseleave)
					.on('click', '.detail', this.detailClick)
					.on('click', '.geneAverage', this.geneAverageClick)
					.on('click', '.impact', this.impactClick)
					.on('click', '.dna_vaf', this.dna_vafClick)
					.on('click', '.rna_vaf', this.rna_vafClick)
					.on('click', '.kmPlot', this.kmPlotClick)
					.on('click', '.edit', this.editClick)
					.on('click', '.duplicate', this.duplicateClick)
					.on('click', '.about', this.aboutClick)
					.on('click', '.download', this.downloadClick)
					.on('click', '.vizSettings', this.vizSettingsClick)
					.on('click', '.remove', this.removeClick);
			};
		};

	ColumnMenu.prototype = new Menu();

	function create(id, options) {
		var w = new ColumnMenu();
		w.id = id;
		w.initialize(options);
		return w;
	}

	return {
		create: function (id, options) {
			return create(id, options);
		}
	};
});
