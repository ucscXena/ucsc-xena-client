/*jslint nomen:true, browser: true */
/*global define: false  */

define(["haml!haml/download", "defer", "galaxy", "jquery", "util", "underscore_ext", "analytics",
	"loading"], function (template, defer, galaxy, $, util, _, analytics) {
	'use strict';

	var bind = _.bind,
		each = _.each,
		filter = _.filter,
		flatten = _.flatten,
		keys = _.keys,
		map = _.map,
		toArray = _.toArray,
		uniq = _.uniq,
		widget,
		aWidget,

		url = function (track) {
			return track.procFile.urlPrefix + track.procFile.name;
		},

		opentrack = function (track) {
			window.open(url(track));
			analytics.report({
				category: 'output',
				action: 'download',
				label: track.id
			});
		},

		galaxyDownload = function (track) {
			galaxy.download(url(track));
			analytics.report({
				category: 'output',
				action: 'galaxyDownload',
				label: track // or track.id ?
			});
		},

		tcga = function (dsID) {
			return (dsID.toLowerCase().indexOf('tcga') > -1);
		};

	aWidget = {

		destroy: function () {
			this.$el.dialog('destroy').remove();
			widget = undefined;
		},

		populateLink: function (tsv, scope) {
			var $link = this.$link,
				self = this,
				prefix = 'column_label', // TODO use a scrubbed column label after it is being stored in state tree
				//prefix = this.ws.column.label;
				blob,
				url;
				//blob = new Blob([tsv], { type: 'text/tsv' }),
				//url = URL.createObjectURL(blob);
			blob = new Blob([tsv], { type: 'text/tsv' });
			url = URL.createObjectURL(blob);
			$link.attr({
				// patch for bug in chrome:
				// https://code.google.com/p/chromium/issues/detail?id=373182
				'href': url,
				/* works for firefox in cancer_browser:clinicalDownload.js, except should be data:text/tsv:
				'href': "data:application/x-download;charset=utf-8," + encodeURIComponent(tsv),
				*/
				'download': prefix + '.tsv'
			});
			defer(function () { // allow link to update, then click it
				var evt = document.createEvent('MouseEvents');
				self.destroy();
				evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0,
					false, false, false, false, 0, null);
				$link[0].dispatchEvent(evt);
			});
		},

		buildTsv: function (data, varNames, scope) {
			var self = this,
				tsv,
				row,
				rows;
			rows = map(data, function (row, i) {
				return row.join('\t');
			});
			defer(function () { // prevent client timeout
				rows.unshift(varNames.join('\t'));
				defer(function () { // prevent client timeout
					tsv = rows.join('\n');
					self.populateLink(tsv, scope);
				});
			});
		},

		xformMutationVector: function () {
			var stableVars = ['sample', 'chr', 'start', 'end', 'reference', 'alt'],
				derivedVars = this.columnUi.plotData.derivedVars.sort(util.caseInsensitiveSort),
				varNames = stableVars.concat(filter(derivedVars, function (dv) {
					return (stableVars.indexOf(dv) === -1);
				})),
				tsvData = flatten(this.columnUi.plotData.values.map(function (sample) {
					if (sample.vals) {
						if (sample.vals.length) {
							return sample.vals.map(function (vals) {
								return varNames.map(function (varName) {
									return vals[varName];
								});
							});
						} else {
							return [
								varNames.map(function (varName) {
									if (varName === 'sample') {
										return sample.sample;
									} else {
										return 'no mutation';
									}
								})
							];
						}
					} else {
						return [[sample.sample]];
					}
				}), true);
			this.buildTsv(tsvData, varNames);
		},

		now: function () {
			var self = this;
			this.$el.loading('show');

			defer(function () { // defer to allow loading feedback to show
				switch (self.ws.column.dataType) {
				case 'exonSparse':
					self.xformMutationVector();
					break;
				default:
					console.log('not yet');
					self.destroy();
				}
			});
			analytics.report({
				category: 'output',
				action: 'download',
				label: this.ws.column.dsID
			});
		},

		render: function () {
			this.$el = $('<div>')
				.html(template({
					tcga: tcga(this.ws.column.dsID)
					//tcga: download.tcga(this.track.id),
					//galaxy: galaxy.downloadableProject(this.track.collection.project)
				}))
				.dialog({
					title: 'Download',
					width: 'auto',
					height: 'auto',
					minHeight: 60,
					close: this.destroy
				})
				.loading({ height: 32 });
		},

		initialize: function (options) {
			var self = this,
				cache = [ /*'dataset', 'cohort', 'full', 'galaxy',*/ 'ok', /*'cancel', 'help',*/ 'link' ];
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.ws = options.ws;
			this.columnUi = options.columnUi;
			this.render();

			_(self).extend(_(cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));

			/*
			this.$el.on('change', '.radio', this.radioChange);
			this.$galaxy
				.button()
				.on('click', function () {
					galaxyDownload(self.track);
					//download.galaxyDownload(self.track);
				})
				.hide();
			*/
			this.$ok
				.button()
				.click(this.now);
			/*
			this.$cancel
				.button()
				.click(this.destroy);
			this.$help
				.button()
				.click(function () {
					window.open('../help#clinical_download');
				});
			*/
		}
	};

	function create(options) {
		var w = Object.create(aWidget);
		w.initialize(options);
		return w;
	}

	return {
		create: function (options) {
			if (widget) {
				widget.destroy();
			}
			widget = create(options);
		}
	};
});
