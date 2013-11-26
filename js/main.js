/*jslint browser: true, regexp: true */
/*global define: false, require: false */

define(['jquery', 'config', 'compat', 'assembly', 'genomicPosition', 'browser', 'error',
		'lib/backbone',
		// non-object dependencies
		'lib/preloadCssImages.jQuery',
		'lib/wrapJquery'
	], function ($, config, compat, assembly, genomicPosition, browser, error, Backbone) {
	'use strict';

	var ajaxErrorRetry = function (xhr, textStatus, errorThrown) {
		var err;
		if (xhr.status === 400) {
			try {
				err = JSON.parse(xhr.responseText);
			} catch (e) {
				if (!e instanceof SyntaxError) {
					throw e;
				}
			}
			if (err && err.reload) {
				error.warning.call(this, err.error, true);
				return;
			}
		}
		if ((textStatus === 'timeout' || xhr.status === 500) && this.retryLimit > 0) {
			this.retryLimit -= 1;
			$.ajax(this);
			return;
		}
		if (this.fail) {
			this.fail(xhr, textStatus, errorThrown);
		} else {
			error.ajax.apply(this, arguments);
		}
	};

	// replaces Backbone's wrapError
	function wrapError(onError, model, options) {
		options.fail = function (xhr, textStatus, errorThrown) {
			if (onError) {
				onError(xhr, textStatus, errorThrown);
			} else {
				model.trigger('error', model, xhr, options);
				error.ajax.apply(this, arguments);
			}
		};
		return ajaxErrorRetry;
	}

	$(document).ready(function () {
		var gp;
		compat.check();
		if (config.DEBUG) {
			require(['debug']);
		}

		Backbone.wrapError = wrapError;

		$.ajaxSetup({
			beforeSend: function (xhr, settings) {
				function getCookie(name) {
					var cookieValue = null,
						cookies = document.cookie.split(';'),
						cookie,
						i;
					if (document.cookie && document.cookie !== '') {
						for (i = 0; i < cookies.length; i += 1) {
							cookie = $.trim(cookies[i]);
							// Does this cookie string begin with the name we want?
							if (cookie.substring(0, name.length + 1) === (name + '=')) {
								cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
								break;
							}
						}
					}
					return cookieValue;
				}
				if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
					// Only send the token to relative URLs i.e. locally.
					xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
				}
			},
			headers: {
				'Cancer-Browser-Api': config.API_VERSION
			},
			retryLimit: 3,
			error: ajaxErrorRetry
		});

		$.preloadCssImages();
		gp = genomicPosition.factory({storageId: 'genomicPosition'});
		$.when(assembly('hg18')).done(function (assembly) {
			gp.assembly(assembly); // set default position XXX move this?
			gp.set('mode', 'chrom');
			gp.set('chromPos', null);
			browser.init(gp);
		});
	});
});
