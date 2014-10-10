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
		aWidget;

	aWidget = {

		destroy: function () {
			this.$el.remove();
			widget = undefined;
		},

		populateLink: function (tsv, scope) {
			var $link = this.$link,
				self = this,
				prefix = 'xenaDownload', // TODO use a scrubbed column label after it is being stored in state tree
				//prefix = util.cleanName(this.ws.column.label1 + '_' + this.ws.column.label2),
				url = URL.createObjectURL(new Blob([tsv], { type: 'text/tsv' })); // use blob for bug in chrome: https://code.google.com/p/chromium/issues/detail?id=373182
			$link.attr({
				'href': url,
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
					return (stableVars.indexOf(dv) < 0);
				})),
				tsvData = flatten(this.columnUi.plotData.values.map(function (sample) {
					if (sample.vals) {
						if (sample.vals.length) { // value(s) for this sample & identifier
							return sample.vals.map(function (vals) {
								return varNames.map(function (varName) {
									return vals[varName];
								});
							});
						} else { // no value for this sample & identifier
							return [
								varNames.map(function (varName) {
									return (varName === 'sample')
										? sample.sample
										: 'no mutation';
								})
							];
						}
					} else { // no data for this sample & identifier
						return [
							varNames.map(function (varName) {
								return (varName === 'sample')
									? sample.sample
									: null;
							})
						];
					}
				}), true);
			this.buildTsv(tsvData, varNames);
		},

		xformProbeMatrix: function () {
			var self = this,
				heatmapData = this.columnUi.plotData.heatmapData,
				samples = this.columnUi.plotData.samples,
				fields = this.columnUi.plotData.fields,
				codes = this.columnUi.plotData.codes,
				varNames = ['sample'].concat(fields),
				tsvData = samples.map(function (sample, i) {
					return [sample].concat(fields.map(function (field, j) {
						var value = codes[field]
							? codes[field][heatmapData[j][i]]
							: heatmapData[j][i];
						return value;
					}));
				});
			if (this.ws.column.dataType === 'clinicalMatrix') {
				varNames = ['sample'].concat([this.ws.column.fieldLabel.default]);
			}
			this.buildTsv(tsvData, varNames);
		},

		now: function () {
			var self = this,
				func = {
					mutationVector: this.xformMutationVector,
					geneMatrix: this.xformProbeMatrix,
					geneProbesMatrix: this.xformProbeMatrix,
					probeMatrix: this.xformProbeMatrix,
					clinicalMatrix: this.xformProbeMatrix
				};
			//this.$anchor.loading('show');

			defer(function () { // defer to allow loading feedback to show
				if (func[self.ws.column.dataType]) {
					func[self.ws.column.dataType]();
				} else {
					alert('not yet');
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
			this.$el = $(template());
			this.$anchor
				.append(this.$el);
				//.loading({ height: 32 });
			this.now();
		},

		initialize: function (options) {
			var self = this,
				cache = [ 'link' ];
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.ws = options.ws;
			this.$anchor = options.$anchor;
			this.columnUi = options.columnUi;
			this.render();

			_(self).extend(_(cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));
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
