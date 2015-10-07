/*jslint browser: true, nomen: true, vars: true */
/*global define: false */

define([ 'd3',
		"jquery",
		'underscore',
		"config",
		"defer",
		"km",
		'haml/km.haml',
		"heatmapColors",
		'rx-jquery',
		"xenaQuery",
		'../images/warning.png',
		// non-object dependencies
		'jquery-ui'
	], function (d3, $, _, config, defer, km, template, heatmapColors, Rx, xenaQuery, warningImg) {

	'use strict';

	var each = _.each,
		bind = _.bind,
		map = _.map,
		uniq = _.uniq,
		filter = _.filter,
		last = _.last,
		range = _.range,
		keys = _.keys,
		feature_list = xenaQuery.dsID_fn(xenaQuery.feature_list),
		dataset_probe_values = xenaQuery.dsID_fn(xenaQuery.dataset_probe_values),
		code_list = xenaQuery.dsID_fn(xenaQuery.code_list),
		MAX = 30, // max number of categories
		kmWidget,
		widgets = {};

	function isVal(v) {
		return _.isNumber(v) && !isNaN(v);
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
			var self = this;
			this.destroy(); // depending on the state change to trigger this is too sluggish
			defer(function () { // allow dialog to close
				self.cursor.update(function (s) {
					return _.assoc(s, 'kmPlot', false);
				});
			});
		},

		regroup: function (values) {
			var vals = _.without(values, null).sort(function (a, b) { return a - b; });
			return [ // XXX only works for a regroup count of 3
				vals[Math.round(vals.length / 3)],
				vals[Math.round(2 * vals.length / 3)],
				666 // a dummy just to make the array have 3 elements
			];
		},

		cleanValues: function (vals) {
			var definedVals = {};
			_.each(vals, function (val, key) {
				if (isVal(val)) {
					definedVals[key] = val;
				}
			});
			return definedVals;
		},

		findColorGroup: function (groups, values, groupIndex) {
			var label,
				colorGroup;
			if (groupIndex === 0) {
				label = '< ' + groups[0];
				colorGroup = d3.min(values);
			} else if (groupIndex === 2) {
				label = '> ' + groups[1];
				colorGroup = d3.max(values);
			} else {
				label = groups[0] + ' to ' + groups[1];
				colorGroup = (d3.min(values) + d3.max(values)) / 2;
			}
			return { label: label, colorGroup: colorGroup };
		},

		findGeneAverage: function (values) {
			var sampleCount = values[0].length,
				sums = [],
				counts = [],
				averages,
				i;
			for (i = 0; i < sampleCount; i += 1) {
				sums.push(0);
				counts.push(0);
			}
			each(values, function (probeVals) {
				each(probeVals, function (val, j) {
					if (isVal(val)) {
						sums[j] += val;
						counts[j] += 1;
					}
				});
			});
			averages = map(sums, function (sum, i) {
				if (counts[i] > 0) {
					return Number((sum / counts[i]).toPrecision(6));
				} else {
					return undefined;
				}
			});
			return averages;
		},

		findChiefAttrs: function (samples, field) {
			var ws = this.columnUi.ws,
				c = {
					dataType: ws.column.dataType,
					label: ws.column.fieldLabel.user,
					isfloat: true,
					valuetype: null, // only used by heatmapColors.range();
					codes: null
				},
				uncleanVals;

			// find values
			c.values={};
			if (c.dataType === 'mutationVector') {
				_.map(ws.data.req.values[field], function (mutations,sample) {
					c.values[sample]= mutations.length > 0 ? 1 : 0;
				});
			} else if (c.dataType === 'geneProbesMatrix') {
				uncleanVals = this.findGeneAverage(this.columnUi.plotData.heatmapData);
				c.values = this.cleanValues(_.object(samples, uncleanVals));
			} else {
				uncleanVals = this.columnUi.plotData.heatmapData[0];
				c.values = this.cleanValues(_.object(samples, uncleanVals));
			}

			// find additional clinical & mutation info
			if (c.dataType === 'clinicalMatrix') {
				c.valuetype = ws.data.features[field].valuetype;
				if (c.valuetype !== 'category' || !(ws.data.codes[field])) {
					c.valuetype = 'float';
					c.colorValues = this.columnUi.plotData.heatmapData[0]; // XXX make this the default
				}
				c.isfloat = (c.valuetype === 'float');
				if (!c.isfloat) {
					c.codes = ws.data.codes[field];
				}
			} else if (c.dataType === 'mutationVector') {
				c.valuetype = 'codedWhite';
				c.colorValues = [0, 1];
				c.isfloat = false;
				c.codes = [
					'No Mutation',
					'Has Mutation'
				];
			}
			return c;
		},

		///////// problematic code, that if there is no _PATIANT variable, it generates error,
		///////// if the _PATIENT is not in the same dataset as _EVENT etc , it fails. I suspect that if not all
		/////////  _EVENT _TTE _PATIANT are in the same datafile, it will fail.
		/////////  very sloppy code.
		receiveCodes: function (codes, dupPatientSamples, samplesToCodes) {
			var dupCodes = filter(samplesToCodes, function (code, sample) {
					return _.find(dupPatientSamples, function (dup) {
						return dup === sample;
					});
				}),
				dupArray = map(dupCodes, function (pc) {
					return codes[pc];
				}),
				dupSamples = filter(samplesToCodes, function (code) {
					return dupCodes.indexOf(code) > -1;
				}),
				msg = 'There are ' +
					dupSamples.length +
					' samples in this plot mapped to the same _PATIENT IDs: ' +
					dupArray.join(', ');
			this.warningIcon.prop('title', msg);
		},

		receiveSurvivalData: function (data) {
			var self = this,
				subgroups = [],
				ws = self.columnUi.ws,
				field = ws.column.fields[0],
				all = false, // XXX make this a checkbox, for whole-cohort display grouping, not implemented for regrouping
				samples = this.columnUi.plotData.samples,
				//data is  [event_fid, ttevent_fid, patient_fid])
				ttevValues = this.cleanValues(_.object(samples, data[1])),
				ttev_fn    = bind(attr, null, ttevValues), // fn sample -> ttev,
				ev_fn      = bind(attr, null, this.cleanValues(_.object(samples, data[0]))), // fn sample -> ev,
				samplesToCodes = _.object(samples, data[2]),
				patient_fn = bind(attr, null, samplesToCodes), // fn sample -> patient,
				chief,
				values,
				groups,
				regroup,
				patientUniqueSamples,
				dupPatientSamples,
				allGroups_tte=[],
				allGroups_ev=[],
				r;

			chief = self.findChiefAttrs(samples, field);
			values = all ? null : _.values(chief.values);

			// reduce sample list to those that have values in each of chief, _EVENT & _TIME_TO_EVENT.

			samples = filter(
				filter(
					keys(chief.values),
					function (t) { return isVal(ttev_fn(t)); }
				),
				function (e) {
					return isVal(ev_fn(e));
				}
			);

			// check for duplicate patients ending up on the plot, to give a warning.
			patientUniqueSamples = uniq(samples, false, patient_fn);
			dupPatientSamples = _.difference(samples, patientUniqueSamples);
			if (dupPatientSamples.length) {
				this.subs.add(code_list(this.survivalDsID, [this.survivalPatient])
					.subscribe(function (codes) {
						self.receiveCodes(codes[self.survivalPatient], dupPatientSamples, samplesToCodes);
					}));
			}

			// Group by unique values, throwing out non-values. Coded feature values are always indexes 0..N-1.
			groups = all ? ['All samples'] : (chief.isfloat ? filter(uniq(values), isVal) : range(chief.codes.length));
			regroup = (chief.isfloat && groups.length > 10);
			if (regroup) {
				groups = self.regroup(values);
			}

			self.featureLabel.text('Grouped by: ' +
				(all ? 'All samples' : chief.label) +
				(groups.length > MAX && !regroup ? " (Limited to " + MAX + " categories)" : "") +
				(chief.dataType === 'geneProbesMatrix' ? ' (gene-level average)' : ''));

			each(groups, function (group, i) {
				var label,
					samples = all ? _.keys(ttevValues) : filter(keys(chief.values), function (s) {
						if (regroup) {
							return (i === 0 && chief.values[s] < groups[0]) ||
								(i === 2 && chief.values[s] > groups[1]) ||
								(i === 1 && chief.values[s] >= groups[0] && chief.values[s] <= groups[1]);
						} else {
							return chief.values[s] === group;
						}
					}),
					/*jslint eqeq: true */
					/*jshint eqnull: true */
					samplesNotNullTtevFn = filter(samples, function (s) { return ttev_fn(s) != null; }),
					tte =map(samplesNotNullTtevFn, ttev_fn),
					ev= map(samplesNotNullTtevFn, ev_fn),
					res = km.compute(tte, ev);

				if (res.length > 0) {
					if (dupPatientSamples.length) {
						self.warningIcon.show();
					}
					if (regroup) {
						r = self.findColorGroup(groups, values, i);
						label = r.label;
					} else {
						label = (chief.isfloat ? group : chief.codes[group]);
					}
					subgroups.push({
						name: label + " (n=" + samplesNotNullTtevFn.length + ")",
						group: (regroup ? r.colorGroup : group),
						values: res,
						tte: tte,
						ev:ev
					});
					allGroups_tte = allGroups_tte.concat(tte);
					allGroups_ev = allGroups_ev.concat(ev);
				}
			});

			this.subgroups = subgroups;

			// KM stats computation
			var groupedDataTable=[], // grouped raw data table
				allGroupsRes = km.compute(allGroups_tte, allGroups_ev);

			allGroupsRes = allGroupsRes.filter(function(item){  //only keep the curve where there is an event
				if (item.e) {return true;}
				else {return false;}
			});

			groupedDataTable = map(subgroups, function(group){
				return {tte: group.tte, ev:group.ev};
			});

			r = km.logranktest (allGroupsRes, groupedDataTable);
			this.KM_stats = r.KM_stats;
			this.pValue = r.pValue;

			self.render();
		},

		getSurvivalData: function (eventDsID, survival) {
			var self = this,
				event_fid = survival.event,
				ttevent_fid = survival.tte,
				patient_fid = survival.patient,
				ws = this.columnUi.ws,
				field = ws.column.fields[0],
				samples = this.columnUi.plotData.samples;

			this.survivalDsID = eventDsID;
			this.survivalPatient = survival.patient;

			if (!event_fid || !ttevent_fid) {
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
			this.subs.add(dataset_probe_values(eventDsID, samples, [event_fid, ttevent_fid, patient_fid])
				.subscribe(self.receiveSurvivalData));
		},

		setupSvg: function (svgWidth, svgHeight, textArea) {
			if(this.svg) {
				this.svg.selectAll("*").remove();
			}

			var margin = {top: 20, right: 20, bottom: 40, left: 50},
				width = svgWidth - margin.left - margin.right - textArea, // plot width
				height = svgHeight - margin.top - margin.bottom, // plot height

				x = d3.scale.linear().range([0, width]),
				y = d3.scale.linear().range([height, 0]),
				xAxis = d3.svg.axis().scale(x).orient("bottom"),
				yAxis = d3.svg.axis().scale(y).orient("left");

			this.svg = d3.select(this.kmplot[0])
				.attr("width", svgWidth )
				.attr("height", svgHeight)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			x.domain([0, 100]); // random default
			y.domain([0, 1]);

			this.svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			this.svg.append("g")
				.attr("class", "y axis")
				.call(yAxis)
				.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("x", -height)
				.attr("dy", ".71em")
				.style("text-anchor", "start")
				.text("Survival percentage");

			this.x = x;
			this.y = y;
		},

		render: function (){
			var subgroups = this.subgroups.slice(0,MAX),
				KM_stats = this.KM_stats,
				pValue = this.pValue,

				buffer = 100,
				svgHeight = this.$dialog.height() - buffer,
				svgWidth = this.$dialog.width() - buffer/2,
				lineSpacing = 35,
				yStart = lineSpacing*2,
				nCols= parseInt( lineSpacing * subgroups.length / (svgHeight - yStart )) +1,  // number of text columns
				nItem = parseInt((svgHeight -yStart) / lineSpacing), // number of item per text column
				textArea = _.min([nCols*0.2, 0.4]) *svgWidth + buffer/2, //max text area is 40%
				wColumn = parseInt((textArea - buffer/2)/ nCols);  //width of each text column

			this.setupSvg(svgWidth,svgHeight, textArea);

			var svg= this.svg,
				x = this.x,
				y = this.y,
				color = _.get_in(this, ['columnUi', 'ws', 'colors', 0]),
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
				// TODO d is always null
				d3.select(this).transition()
					.duration(300)
					.attrTween("d", pathTween(d))
					.style("stroke", function (d) { return color(d.group); });
			};

			x.domain([
				d3.min(subgroups, function (sg) { return d3.min(sg.values, function (v) { return v.t; }); }),
				d3.max(subgroups, function (sg) { return d3.max(sg.values, function (v) { return v.t; }); })
			]);


			subgroup = this.svg.selectAll(".subgroup").data(subgroups);

			sgg = subgroup.enter().append("g").attr("class", "subgroup");

			subgroup.style("stroke", function (d) { return color(d.group); });

			sgg.append("path").attr("class", "outline").attr("d", "M0,0");
			sgg.append("path").attr("class", "line").attr("d", "M0,0");
			sgg.append("text")
				.attr("x", 3)
				.attr("dy", ".35em")
				.style("stroke", "none");

			subgroup.select('path.line')
				.each(update);
				// Without transition, remove the each(), and add these.
				//	.attr("d", function (d) { return line([{t: x.domain()[0] - 1, s: 1}].concat(d.values)); }) // add the point at 100%
				//	.style("stroke", function (d) { return color(d.group); });

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


			//p value and statistics
			var xStart =svgWidth - textArea ;

			if (this.KM_stats){
				if (pValue < 1e-4){
					this.svg.append("text").attr("x",xStart).text("p value = "+d3.format(".2e")(pValue));
				}
				else{
					this.svg.append("text").attr("x",xStart).text("p value = "+d3.format(".2g")(pValue));
				}
				this.svg.append("text").attr("x",xStart).attr("y",lineSpacing).text("Log-rank test statistics = "+KM_stats.toPrecision(3));
			}

			// legend: lines and text labels
			var	xEnd,
				labelStart, labelSize,
				textY;

			subgroup.each(function (group,i) {
				xStart = svgWidth - textArea + parseInt(i/nItem) * wColumn;
				textY =  yStart + lineSpacing* (i%nItem) ; //30 line spacing

				xEnd = xStart +30;
				labelStart = xStart +35;
				labelSize = wColumn - 35;

				//line
				//sgg.append("path").attr("class", "line")
				svg.append("line").attr({ "x1": xStart, "y1": textY, "x2": xEnd, "y2": textY})
					.style("stroke", color(group.group)).style("stroke-width", 3);

				//outline
				if (color(group.group)==="#ffffff"){
					svg.append("rect").attr({ "x": xStart-1, "y": textY-1, "width": 32, "height": 3, "fill":"none"})
						.style("stroke", "gray"/*color(group.group)*/).style("stroke-width", 1);
					}

				//label
				svg.append("foreignObject").attr({"x":labelStart,"y":textY-8,"width":labelSize,'height':lineSpacing})
				.text(group.name);
			});
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
				dsIDs;

			if (clinicalMatrices.length < 1) {
				this.kmScreen.text("Cannot find the phenotype data.");
				this.kmScreen.addClass('notify');
				return;
			}
			this.kmScreen.removeClass('notify');

			dsIDs = _.map(clinicalMatrices, function (cm) { return cm.dsID; });

			this.subs.add(Rx.Observable.zipArray(_.map(dsIDs, function (dsID) {
				return feature_list(dsID);
			}))
				.subscribe(function (features_by_dataset) {
					var eventDsID,
						survival = {},
						survivalFound;
					if (features_by_dataset.length === dsIDs.length) {
						_.each(features_by_dataset, function (features, i) {
							if (!survivalFound) {
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
								if (survival.event && survival.tte) {
									// find the first dataset with survival vars (refine later)
									survivalFound = true;
									return;
								}
							}
						});
						self.cursor.update(function (s) {
							return _.assoc_in(s, ['kmPlot', 'eventDsID'], eventDsID);
						});
						self.cursor.update(function (s) {
							return _.assoc_in(s, ['kmPlot', 'survival'], survival);
						});
						self.getSurvivalData(eventDsID, survival);
					}
				}));
		},

		cache: [ 'kmScreen', 'kmplot', 'featureLabel', 'warningIcon' ],

		geometryChange: function () {
			this.render();
		},

		initialize: function (options) {
			var self = this,
				position,
				width = window.innerWidth? window.innerWidth-250: 800,
				height =window.innerHeight? window.innerHeight-50: 500,
				myWs = options.columnUi.ws.column.kmPlot,
				dialogClass = 'kmPlotDialog-' + this.id;

			this.columnUi = options.columnUi;
			this.cursor = options.cursor;
			this.subs = new Rx.CompositeDisposable();
			_.bindAll.apply(_, [this].concat(_.functions(this)));

			this.$el = $(template({
				warningImg: warningImg
			}))
				.dialog({
					dialogClass: dialogClass,
					title: 'Kaplan-Meier: ' + this.columnUi.ws.column.columnLabel.user,
					close: this.close,
					width: width,
					height: height,
					position: position,
					resizeStop: this.geometryChange,
				});
			this.$dialog = $('.' + dialogClass);

			// cache jquery objects for active DOM elements
			_(self).extend(_(self.cache).reduce(function (a, e) { a[e] = self.$el.find('.' + e); return a; }, {}));

			if (myWs.eventDsID && myWs.survival) {
				this.getSurvivalData(myWs.eventDsID, myWs.survival);
				// TODO for now, assume survival vars are still in the saved eventDsID.
			}
			else {
				this.setSurvivalVars();
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
		var w = widgets[id];
		if (w) {
			w.destroy();
		}
		w = widgets[id] = kmCreate(id, options);
	}

	return {

		show: show,

		moveToTop: function (id) {
			if (widgets[id]) {
				widgets[id].$el.dialog('moveToTop');
			}
		},

		destroy: function (id, options) {
			if (widgets[id]) {
				widgets[id].destroy();
			}
		}
	};
});

