/*jslint nomen:true, browser: true */
/*global define: false  */

define(["galaxy", "haml!haml/downloadTemplate", "jquery", "util", "lib/underscore", "analytics"
	], function (galaxy, template, $, util, _, analytics) {
	'use strict';

	var widgets = {},

		url = function (track) {
			return track.procFile.urlPrefix + track.procFile.name;
		},

		opentrack = function (track) {
			window.open(url(track));
		},

		widget = {

			moveToTop: function () {
				this.$el.dialog('moveToTop');
			},

			destroy: function () {
				this.$el.dialog('destroy').remove();
				delete widgets[this.dsID];
			},

			now: function () {
				this.destroy();
				opentrack(this.track);
				analytics.report({
					category: 'output',
					action: 'download',
					label: this.track.id
				});
			},

			galaxy: function () {
				this.destroy();
				galaxy.download(url(this.track));
				analytics.report({
					category: 'output',
					action: 'galaxyDownload',
					label: this.track.id
				});
			},

			render: function () {
				var fromGalaxy = false;
				if (this.track.collection.project === 'public') {
					fromGalaxy = galaxy.fromGalaxy();
				}
				this.$el.html(template({
					filename: this.track.procFile.name,
					mBytes: this.track.procFile.mBytes,
					version: this.track.get('version'),
					galaxy: fromGalaxy
				}));
			},

			initialize: function (track) {
				var $galaxy;
				_(this).bindAll(); // force all of the functions' "this" be this widget
				this.$el = $('<div>')
					.dialog({
						title: 'Download Processed Dataset',
						minWidth: 600,
						minHeight: 100,
						close: this.destroy
					});
				this.track = track;
				this.render();
				$galaxy = this.$el.find('.galaxy');
				if ($galaxy.length) {
					$galaxy.button()
						.click(this.galaxy);
				}
				this.$el.find('.downloadOk')
					.button()
					.click(this.now);
				this.$el.find('.downloadCancel')
					.button()
					.click(this.destroy);
				this.$el.find('.downloadHelp')
					.button()
					.click(function () {
						window.open('../help#download');
					});
			}
		};

	function downloadCreate(track) {
		var w = Object.create(widget);
		w.dsID = track.id;
		w.initialize(track);
		return w;
	}

	return (function () {
		var ext = '.tgz',
			dlUrlPrefix = '/download/';

		function show(track) {
			var dsID = track.id,
				w = widgets[dsID];
			if (w) {
				w.moveToTop();
			} else {
				widgets[dsID] = downloadCreate(track);
			}
		}

		function headerDownloadClick(e, track) {
			show(track);
			e.stopPropagation();
		}

		function findFile(track) {
			var userDsID,
				urlPrefix,
				name,
				mBytes,
				found = false;
			if (track.get('procFile')) {
				found = true;
			} else {
				userDsID = util.userDsID(track.id);
				urlPrefix = dlUrlPrefix + track.collection.project + '/';
				name = userDsID + '-' + track.get('version') + ext;
				mBytes = '666';
				found = true; // XXX stub until we are really finding file
				if (found) {
					track.procFile = {};
					track.procFile.name = name;
					track.procFile.mBytes = mBytes;
					track.procFile.urlPrefix = urlPrefix;
				}
			}
			return found;
		}

		return {

			now: opentrack,
			findFile: findFile,
			show: show,

			initialize: function (track, headerDownload) {
				if (track.get('redistribution') && findFile(track)) {
					headerDownload.click(function (e) {
						headerDownloadClick(e, track);
					});
					headerDownload.attr('title', 'Download processed dataset');
				} else {
					headerDownload.css('opacity', 0).addClass('invisible');
				}
			}
		};
	}());
});
