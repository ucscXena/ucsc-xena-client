/*jslint browser: true, nomen: true, vars: true */
/*global define: false */

define([ "lib/d3",
		"jquery",
		"lib/underscore",
		"defer",
		"km",
		"haml!haml/km",
		"heatmapColors",
		"rx.jquery",
		"xenaQuery",
		// non-object dependencies
		"lib/jquery-ui"
	], function (d3, $, _, defer, km, template, heatmapColors, Rx, xenaQuery) {

	'use strict';

	var each = _.each,
		bind = _.bind,
		map = _.map,
		uniq = _.uniq,
		filter = _.filter,
		pluck = _.pluck,
		once = _.once,
		last = _.last,
		isNull = _.isNull,
		range = _.range,
		keys = _.keys,
		MAX = 30, // max number of categories
		kmWidget,
		widgets = {};

	function notNull(x) {
		return !isNull(x);
	}

	function attr(obj, a) {
		return obj[a];
	}

	kmWidget = {

		destroy: function () {
			this.$el.dialog('destroy').remove();
			this.subs.dispose();
			delete widgets[this.id];
		},

		close: function () {
			this.cursor.update(function (s) {
				return _.assoc(s, 'kmPlot', false);
			});
		},

		render: function (eventDsID, survival) {
			var self = this,
				data = [],
				event_fid = survival.event,
				ttevent_fid = survival.tte,
				patient_fid = survival.patient,
				ws = this.columnUi.ws,
				field = ws.column.fields[0],
				all = false, // XXX make this a checkbox, for whole-cohort display
				samples = ws.samples,
				probes = [event_fid, ttevent_fid, patient_fid];

			if (!event_fid || !ttevent_fid || !patient_fid) {
				this.kmScreen.text("Cannot find the curated survival data.");
				this.kmScreen.addClass('notify');
				return;
			}
			if (!field) {
				this.kmScreen.text("No data found to plot");
				this.kmScreen.addClass('notify');
				return;
			}
			this.kmScreen.removeClass('notify');

			// retrieve the values for each of the event features
			this.subs.add(xenaQuery.dataset_probe_values(eventDsID, samples, probes)
				.subscribe(function (v) {
					var ws = self.columnUi.ws,
						field = ws.column.fields[0],
						allVals = [_.object(samples, v[0]), _.object(samples, v[1]), ws.data.req.values[field]],
						patient = { values: _.object(samples, v[2]) },
						ev = { values: {} },
						ttev = { values: {} },
						feat = {
							codes: ws.data.codes[field],
							metadata: {
								valuetype: ws.data.features[field].valuetype,
								longtitle: ws.data.features[field].longtitle
							},
							values: {}
						},
						definedVals = [ev.values, ttev.values, feat.values],
						isfloat = feat.metadata.valuetype === 'float',
						values = all ? null : _.values(feat.values),
						// Group by unique values. Coded feature values are always indexes 0..N-1.
						groups = all ? ['All samples'] : (isfloat ? filter(uniq(values), notNull) : range(feat.codes.length)),
						ttev_fn,
						ev_fn,
						patient_fn,
						min_t;
					_.each(allVals, function (vals, i) {
						_.each(vals, function (val, key) {
							if (val !== "NaN" && val !== undefined) {
								definedVals[i][key] = val;
							}
						});
					});
					ttev_fn    = bind(attr, null, ttev.values);    // fn sample -> ttev
					ev_fn      = bind(attr, null, ev.values);      // fn sample -> ev
					patient_fn = bind(attr, null, patient.values); // fn sample -> patient
					min_t = d3.min(_.values(ttev.values));

					each(groups.slice(0, MAX), function (group, i) {
						/*jslint eqeq: true */
						var samples = all ? _.keys(ttev.values) : filter(keys(feat.values), function (s) { return feat.values[s] === group; }), // All samples in category 
							uniq_samp = uniq(filter(samples, function (s) { return ttev_fn(s) != null; }), false, patient_fn),
							res = km.compute(map(uniq_samp, ttev_fn), map(uniq_samp, ev_fn));

						if (res.length > 0) {
							data.push({name: (isfloat ? group : feat.codes[group]) + " (n=" + uniq_samp.length + ")", group: group, values: res});
						}
					});

					self.featureLabel.text('Grouped by: '
						+ (all ? 'All samples' : feat.metadata.longtitle)
						+ (groups.length > MAX ? " (Limited to " + MAX + " categories)" : ""));
					self.renderNow(data, feat);
				}));
		},

		setupSvg: function () {
			var margin = {top: 20, right: 200, bottom: 30, left: 50},
				width = 1050 - margin.left - margin.right,
				height = 500 - margin.top - margin.bottom,

				x = d3.scale.linear().range([0, width]),
				y = d3.scale.linear().range([height, 0]),
				xAxis = d3.svg.axis().scale(x).orient("bottom"),
				yAxis = d3.svg.axis().scale(y).orient("left"),

				svg = d3.select(this.kmplot[0])
					.attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			x.domain([0, 100]); // random default
			y.domain([0, 1]);

			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("x", -height)
				.attr("dy", ".71em")
				.style("text-anchor", "start")
				.text("Survival percentage");

			this.svg = svg;
			this.x = x;
			this.y = y;
			this.xAxis = xAxis;
		},

		renderNow: function (subgroups, feature) {
			var x = this.x,
				y = this.y,
				// TODO we're already storing some sort of color in this.columnUi.ws.column,
				// so we should be able to use that, or store the colorFn there to use here
				//color = this.columnUi.ws.column.colorFn,
				//color = this.columnUi.ws.column.color,
				color = heatmapColors.range(this.columnUi.ws.column, feature.metadata, feature.codes),
				line = d3.svg.line().interpolate("step-after")
					.x(function (d) { return x(d.t); })
					.y(function (d) { return y(d.s); }),
				subgroup,
				sgg,
				update;

			// there is probably a faster algorithm, since we're drawing single-valued
			// functions. Sampling splines is a bit of an overkill.
			function pathTween(d0) {
				return function (data, j, a) {
					var precision = 4,
						d1 = line([{t: x.domain()[0] - (x.domain()[1] - x.domain()[0]) / 1000, s: 1}].concat(data.values)), // include point at 100%
						path0 = this,
						path1 = path0.cloneNode(),
						n0 = path0.getTotalLength(),
						n1;

					path1.setAttribute("d", d1);
					n1 = path1.getTotalLength();

					// Uniform sampling of distance based on specified precision.
					var distances = [0], i = 0, dt = precision / Math.max(n0, n1);
					while ((i += dt) < 1) {
						distances.push(i);
					}
					distances.push(1);

					// Compute point-interpolators at each distance.
					var points = distances.map(function (t) {
						var p0 = path0.getPointAtLength(t * n0),
							p1 = path1.getPointAtLength(t * n1);
						return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
					});

					return function (t) {
						return t < 1 ? "M" + points.map(function (p) { return p(t); }).join("L") : d1;
					};
				};
			}

			update = function (s) {
				var d = this.getAttribute('d');
				d3.select(this).transition()
					.duration(300)
					.attrTween("d", pathTween(d))
					//.style("stroke", color(d.group));
					.style("stroke", function (d) { return color(d.group); });
			};

			x.domain([
				d3.min(subgroups, function (sg) { return d3.min(sg.values, function (v) { return v.t; }); }),
				d3.max(subgroups, function (sg) { return d3.max(sg.values, function (v) { return v.t; }); })
			]);
			this.svg.select(".x.axis").transition().call(this.xAxis);

			subgroup = this.svg.selectAll(".subgroup").data(subgroups);

			sgg = subgroup.enter().append("g").attr("class", "subgroup");

			//subgroup.style("stroke", color(d.group));
			subgroup.style("stroke", function (d) { return color(d.group); });

			sgg.append("path").attr("class", "outline");
			sgg.append("path").attr("class", "line");
			sgg.append("text")
				.attr("x", 3)
				.attr("dy", ".35em")
				.style("stroke", "none");

			subgroup.select('path.line')
				.each(update);
				// Without transition, remove the each(), and add these.
//				.attr("d", function (d) { return line([{t: x.domain()[0] - 1, s: 1}].concat(d.values)); }) // add the point at 100%
//				.style("stroke", function (d) { return color(d.group); });

			subgroup.select('path.outline')
				.each(update);


			subgroup.select('text')
				.attr("transform", function (d) {
					d = last(d.values);
					return "translate(" + x(d.t) + "," + y(d.s) + ")";
				})
				.text(function (d) { return d.name; });

			subgroup.exit().remove();

			function censorLine(classname) {
				var sgcensor;
				// censor lines
				sgcensor = subgroup.selectAll('line.' + classname)
					.data(function (d) { return filter(d.values, function (pt) { return !pt.e; }); });

				sgcensor.enter().append('line')
					.attr('class', classname)
					.attr("x1", "0")
					.attr("x2", "0")
					.attr("y1", "-5")
					.attr("y2", "5");

				sgcensor.attr("transform", function (d) { return "translate(" + x(d.t) + "," + y(d.s) + ")"; });
				sgcensor.exit().remove();
			}

			censorLine('outline'); // render the outline first, so the color will overlay it
			censorLine('line');
		},

		setSurvivalVars: function () {
			// Update survival vars using:
			// 1. stored eventDsID's survival vars
			// 2. find all the clinicalMatrices in the cohort
			// 3. find the first one with survival vars (refine later)
			// 4. if not found, make them all undefined
			var self = this,
				clinicalMatrices = _.flatten(_.map(this.columnUi.ws._sources, function (server) {
					return _.filter(server.datasets, function (dataset) {
						return dataset.type === 'clinicalMatrix';
					});
				})),
				dsIDs = _.map(clinicalMatrices, function (cm) { return cm.dsID; });

			// for each clinicalMatrix, find survival vars
			this.subs.add(Rx.Observable.zipArray(_.map(dsIDs, function (dsID) {
				return xenaQuery.feature_list(dsID);
			}))
				.subscribe(function (features_by_dataset) {
					var eventDsID,
						survival = {};
					if (features_by_dataset.length === dsIDs.length) {
						_.each(features_by_dataset, function (features, i) {
							var dsID = dsIDs[i],
								featureKeys = _.map(features, function (val, key) { return key; });
							survival.event = _.find(featureKeys, function (key) {
								return key === '_EVENT';
							});
							survival.tte = _.find(featureKeys, function (key) {
								return key === '_TIME_TO_EVENT';
							});
							survival.patient = _.find(featureKeys, function (key) {
								return key === '_PATIENT';
							});
							eventDsID = dsID;
							if (survival.event && survival.tte && survival.patient) {
								// find the first dataset with survival vars (refine later)
								return;
							}
						});
						self.cursor.update(function (s) {
							return _.assoc_in(s, ['kmPlot', 'eventDsID'], eventDsID);
						});
						self.cursor.update(function (s) {
							return _.assoc_in(s, ['kmPlot', 'survival'], survival);
						});
						self.render(eventDsID, survival);
					}
				}));
		},

		cache: [ 'kmScreen', 'kmplot', 'featureLabel' ],

		geometryChange: function () {
			var self = this,
				offset = this.$dialog.offset();
			this.cursor.update(function (s) {
				return _.assoc_in(s, ['kmPlot', 'geometry'], {
					left: offset.left,
					top: offset.top,
					width: self.$dialog.width(),
					height: self.$dialog.height()
				});
			});
		},

		initialize: function (options) {
			var self = this,
				position,
				width,
				height,
				myWs = options.columnUi.ws.column.kmPlot,
				geometry = myWs.geometry,
				dialogClass = 'kmPlotDialog-' + this.id;
			this.columnUi = options.columnUi;
			this.cursor = options.cursor;
			this.subs = new Rx.CompositeDisposable();
			_.bindAll.apply(_, [this].concat(_.functions(this)));

			if (geometry === 'default') {
				position = {
					my: 'left top',
					at: 'right top',
					of: options.columnUi.$el
				};
				width = height = 'auto';
			} else {
				position = {
					my: 'left top',
					at: 'left+' + geometry.left + ' top+' + geometry.top,
					of: $(document)
				};
				width = geometry.width;
				height = geometry.height;
			}

			this.$el = $(template())
				.dialog({
					dialogClass: dialogClass,
					title: 'Kaplan-Meier: ' + this.columnUi.ws.column.columnLabel.user,
					close: this.close,
					width: width,
					height: height,
					position: position,
					resizeStop: this.geometryChange,
					dragStop: this.geometryChange
				});
			this.$dialog = $('.' + dialogClass);

			// cache jquery objects for active DOM elements
			_(self).extend(_(self.cache).reduce(function (a, e) { a[e] = self.$el.find('.' + e); return a; }, {}));

			this.setupSvg();
			defer(this.geometryChange);

			if (geometry === 'default') {
				this.setSurvivalVars();
			} else if (myWs.eventDsID && myWs.survival) {
				this.render(myWs.eventDsID, myWs.survival);
				// TODO for now, assume survival vars are still in the saved eventDsID.
			}
		}
	};

	function kmCreate(id, options) {
		var m = Object.create(kmWidget);
		m.id = id;
		m.initialize(options);
		return m;
	}

	function show(id, options) {
		var mapId = id,
			w = widgets[id];
		if (!w) {
			w = widgets[id] = kmCreate(id, options);
		}
	}

	return {

		show: show,

		destroy: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
		}
	};
});

