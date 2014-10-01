/*jslint browser: true, nomen: true */
/*global define: false */

/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

define(['lib/underscore', 'rx', 'rx.dom', 'rx.ext', 'rx.coincidence'
	], function (_, Rx) {
	'use strict';

	function fromEvents(el, events) {
		return Rx.Observable.merge(_.map(events, function (ev) {
			return Rx.Observable.fromEvent(el, ev);
		}));
	}

	function returnKey(ev) {
		return ev.type !== 'keyup' || ev.keyCode === 13;
	}

	function notReturnKey(ev) {
		return ev.type !== 'keyup' || ev.keyCode !== 13;
	}

	function defval(def, val) {
		return val || def;
	}

	var aWidget = {
		setVal: function (val) {
			this.$el
				.val(val)
				.prop('title', val);
		},

		getVal: function() {
			return _.trim(this.$el.val());
		},

		setClass: function(set) {
			if (set) {
				this.$el.addClass('defalt');
			} else {
				this.$el.removeClass('defalt');
			}
		},

		initialize: function (options) {
			_.bindAll.apply(_, [this].concat(_.functions(this)));

			var state = options.state.share(),
				default_ = state.pluck('default').distinctUntilChanged().share(),
				push = fromEvents(options.$el, ['focusout', 'keyup'])  // obs values set by user.
					.filter(returnKey).map(this.getVal),
				pushdef = default_.sampleAll(push, defval).share(),    // obs values set by user, with default.
				change = fromEvents(options.$el, ['keyup', 'change'])  // obs value edits by user.
					.filter(notReturnKey).map(this.getVal),
				subs = new Rx.CompositeDisposable();


			this.$el = options.$el;

			// XXX Shouldn't be doing this. Parameterize on the html
			// if we need flexibility of DOM widget.
			this.$el.addClass('defaultTextInput');
			subs.add(new Rx.Disposable(function () {
				options.$el.removeClass('defaultTextInput');
			}));

			subs.add(
				pushdef.merge(state.pluck('user').distinctUntilChanged()) // push event or state event
					.subscribe(this.setVal));

			subs.add(
				default_.sampleAll(pushdef.merge(change), _.array)  // [def, val] array on push or change.
					.merge(state.map(_.partial(_.pluckPathsArray,   // [def, val] array on state change.
											   [['default'], ['user']])))
					.map(_.apply(_.isEqual))                        // boolean def == val.
					.subscribe(this.setClass));

			subs.add(
				pushdef.subscribe(function (val) {    // update state with push or default
					options.cursor.update(function (s) {
						return _.assoc(s, 'user', val);
					});
				}));

			return subs;
		}
	};

	return {
		create: function (options) {
			var w = Object.create(aWidget);
			return w.initialize(options);
		}
	};
});
