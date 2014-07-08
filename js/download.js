/*jslint nomen:true, browser: true */
/*global define: false  */

define(["haml!haml/download", "defer", "galaxy", "jquery", "util", "underscore_ext", "analytics",
	"loading"], function (template, defer, galaxy, $, util, _, analytics) {
	'use strict';

	var bind = _.bind,
		each = _.each,
		filter = _.filter,
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

		valToCode: function (data, i, feat, j) {
			var val = data[j][i];
			if (feat.model.filtertype === 'coded' && val >= 0) {
				val = feat.codes[val];
			}
			return (val === null || val === undefined) ? '' : val;
		},

		populateLink: function (tsv, scope) {
			var $li = this.$el.find('.' + scope),
				$link = this.$link,
				self = this,
				prefix = (scope === 'dataset') ? this.track.id : scope;
			$link.attr({
				'href': "data:application/x-download;charset=utf-8," + encodeURIComponent(tsv),
				'download': prefix + '_clinical.tsv'
			});
			defer(function () { // allow link to update
				var evt = document.createEvent('MouseEvents');
				self.destroy();
				evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
				$link[0].dispatchEvent(evt);
			});
		},

		buildTsv: function (data, features, scope) {
			var self = this,
				tsv,
				row,
				rows = map(data[0], function (sample, i) {
					return map(features, bind(self.valToCode, null, data, i)).join('\t');
				});
			defer(function () { // prevent client timeout
				rows = uniq(rows);
				defer(function () { // prevent client timeout
					row = map(features, function (feat) {
						return feat.model.shortlabel;
					});
					rows.unshift(row.join('\t'));
					defer(function () { // prevent client timeout
						tsv = rows.join('\n');
						self.populateLink(tsv, scope);
					});
				});
			});
		},

		sort: function (features, sampleName, keys, scope) {
			console.log('sort');
			/*
			var self = this,
				data = heatmapWidget.dataToHeatmap({type: 'heatmap'}, keys, features, sampleName); // order: <visible columns>, _INTEGRATION
			data.unshift(data.pop()); // order: _INTEGRATION, <visible columns>
			features.unshift(features.pop()); // order: _INTEGRATION, <visible-features>
			defer(function () { // prevent client timeout
				self.buildTsv(data, features, scope);
			});
			*/
		},

		buildCohortFile: function (features, sampleName, subgroup) {
			var self = this;
			defer(function () { // allow loading feedback to show
				var cKeys = keys(features[features.length - 1].values), // _INTEGRATION should have all of the keys across the cohort
					cleanFeatures = filter(features, function (f) {
						return (f.model.name.indexOf('profile') !== 0
							&& f.model.name !== 'subgroup');
					});
				self.sort(cleanFeatures, sampleName, cKeys, 'cohort');
			});
		},

		buildDatasetFile: function (features, sampleName, subgroup, samples) {
			console.log('buildDatasetFile');
			/*
			var self = this;
			defer(function () { // prevent client timeout
				var groups = heatmapWidget.dataToGroups({type: 'heatmap'}, samples, subgroup);
				// XXX because we're using the heatmap map type sort,
				//     we're relying on there only being one element in groups
				self.sort(features, sampleName, groups[0], 'dataset');
			});
			*/
		},

		prepare: function (samples, mapFeatures, mapSetting) {
			var self = this,
				fids = mapSetting.get('features'),
				actives = ['sampleName', 'subgroup'].concat(fids);
			actives.push('_INTEGRATION'); // order: sampleName, subgroup, <visible columns>, _INTEGRATION
			mapFeatures.when(actives).then(function (sampleName, subgroup) {
				var features = toArray(arguments).slice(2); // order: <visible-features>, _INTEGRATION
				defer(function () { // prevent client timeout
					if (self.$cohort.attr('checked')) {
						self.buildCohortFile(features, sampleName, subgroup);
					} else {
						self.buildDatasetFile(features, sampleName, subgroup, samples);
					}
				});
			});
		},

		now: function () {
			console.log('now');
			/*
			var self = this;
			if (self.$full.attr('checked')) {
				self.destroy();
				openTrack(self.track);
				//download.now(self.track);
				return;
			}
			this.$el.loading('show');
			defer(function () { // allow loading feedback to show
				$.when(self.track.samples(), self.mapFeatures.ready, self.mapSetting.ready)
					.then(function (samples, mapFeatures, mapSetting) {
						self.prepare(samples, mapFeatures, mapSetting);
					});
			});
			analytics.report({
				category: 'output',
				action: 'download',
				label: this.ws.column.dsID
				//label: this.track.id
			});
			*/
		},

		radioChange: function (ev) {
			var $target = $(ev.target);
			if ($target.hasClass('full')) {
				this.$galaxy.show();
			} else {
				this.$galaxy.hide();
			}
		},

		render: function () {
			this.$el = $('<div>')
				.dialog({
					title: 'Download',
					minWidth: 200,
					minHeight: 100,
					close: this.destroy
				});
			this.$el.html(template({
				tcga: tcga(this.ws.column.dsID)
				//tcga: tcga(this.track.id),
				//tcga: download.tcga(this.track.id),
				//galaxy: galaxy.downloadableProject(this.track.collection.project)
			}));
			this.$el.loading({ height: 32 });
		},

		initialize: function (options) {
			var self = this,
				cache = [ 'dataset', 'cohort', 'full', 'galaxy', 'ok', 'cancel', 'help', 'link' ];
			_.bindAll.apply(_, [this].concat(_.functions(this)));
			//_(this).bindAll();
			this.ws = options.ws;
			//this.mapSetting = options.mapSetting;
			//this.mapFeatures = this.mapSetting.features();
			//this.track = this.mapSetting.track();
			this.render();

			_(self).extend(_(cache).reduce(function (a, e) { a['$' + e] = self.$el.find('.' + e); return a; }, {}));

			this.$el.on('change', '.radio', this.radioChange);
			this.$galaxy
				.button()
				.on('click', function () {
					galaxyDownload(self.track);
					//download.galaxyDownload(self.track);
				})
				.hide();
			this.$ok
				.button()
				.click(this.now);
			this.$cancel
				.button()
				.click(this.destroy);
			this.$help
				.button()
				.click(function () {
					window.open('../help#clinical_download');
				});
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
