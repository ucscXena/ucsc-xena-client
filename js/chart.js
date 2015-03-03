/*global define: false, document: false */
define(['xenaQuery', 'dom_helper', 'highcharts', 'highcharts_helper', 'underscore_ext', 'rx', 'highcharts_exporting', 'highcharts_more'], function (xenaQuery, dom_helper, Highcharts, highcharts_helper, _, Rx) {
	'use strict';
	return function (root, cursor, sessionStorage) {
		var div,
			leftContainer, rightContainer, controlContainer,
			xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
			cohort,
			samples,
			updateArgs;

		root.setAttribute("id", "chartRoot");
		root.style.height =window.innerHeight+'px';  /// best to do with css, but don't how to set the chart to full window height in css

		// left panel
		leftContainer = document.createElement("div");
		leftContainer.setAttribute("id", "left");
		root.appendChild(leftContainer);

		// right panel
		rightContainer = document.createElement("div");
		rightContainer.setAttribute("id", "right");
		root.appendChild(rightContainer);

		// chart container
		rightContainer.appendChild(buildEmptyChartContainer());

		if (!(xenaState && xenaState.cohort && xenaState.samples && xenaState.column_order.length > 0)) {
			document.getElementById("myChart").innerHTML = "There is no heatmap data, please add some.";
			return;
		}

		cohort = xenaState.cohort;
		samples = xenaState.samples;
		updateArgs = [cohort, samples];

		// y axis selector
		div = dom_helper.elt("div",
			axisSelector("Yaxis", update, updateArgs));
		div.setAttribute("id", "Y");
		leftContainer.appendChild(div);

		//controls
		controlContainer = document.createElement("div");
		controlContainer.setAttribute("id", "controlContainer");
		rightContainer.appendChild(controlContainer);
		// whisker is 1, 2, 3 SD
		controlContainer.appendChild(buildSDDropdown());
		// normalization selection
		controlContainer.appendChild(buildNormalizationDropdown());


		// x axis selector
		div = dom_helper.elt("div", "Variable ",
			axisSelector("Xaxis", update, updateArgs));
		div.setAttribute("id", "X");
		rightContainer.appendChild(div);

		update.apply(this, updateArgs);

		//zoom and pan instructions
		rightContainer.appendChild(dom_helper.elt("section", "Click & drag to zoom; add SHIFT to pan."));

		function setStorage(state) {
			sessionStorage.xena = JSON.stringify(state);
			cursor.update(function (s) {
				return _.assoc(s, 'chartState', state.chartState);
			});
		}

		function buildSDDropdown() {
			var dropDownDiv, option,
				dropDown = [{
					"value": 1,
					"text": "1 standard deviation"
				}, {
					"value": 2,
					"text": "2 standard deviation"
				}, {
					"value": 3,
					"text": "3 standard deviation"
				}],
				node = document.createElement("span");

			node.setAttribute("id", "sdDropDown");
			dropDownDiv = document.createElement("select");
			dropDownDiv.setAttribute("id", "sd");
			dropDownDiv.setAttribute("class", "dropdown-style");

			dropDown.forEach(function (obj) {
				option = document.createElement('option');
				option.value = obj.value;
				option.textContent = obj.text;
				dropDownDiv.appendChild(option);
			});

			dropDownDiv.selectedIndex = 0;

			dropDownDiv.addEventListener('change', function () {
				update.apply(this, updateArgs);
			});

			node.appendChild(document.createTextNode(" Whisker "));
			node.appendChild(dropDownDiv);
			return node;
		}

		function buildNormalizationDropdown() {
			var dropDownDiv, option,
				dropDown = [{
						"value": "none",
						"text": "none",
						"index": 0
					}, //no normalization
					{
						"value": "cohort",
						"text": "across cohort",
						"index": 1
					}, //cohort-level
					{
						"value": "subset",
						"text": "across selected samples",
						"index": 2
					} //selected sample level
				],
				node = document.createElement("span");

			node.setAttribute("id", "normDropDown");
			dropDownDiv = document.createElement("select");
			dropDownDiv.setAttribute("id", "ynormalization");
			dropDownDiv.setAttribute("class", "dropdown-style");

			dropDown.forEach(function (obj) {
				option = document.createElement('option');
				option.value = obj.value;
				option.textContent = obj.text;
				dropDownDiv.appendChild(option);
			});

			dropDownDiv.selectedIndex = 0;

			dropDownDiv.addEventListener('change', function () {
				// using chart normalization to set heatmap default
				// setXenaColNormalizationState();

				update.apply(this, updateArgs);
			});

			node.appendChild(document.createTextNode(" Normalization "));
			node.appendChild(dropDownDiv);
			return node;
		}

		function buildEmptyChartContainer() {
			var chartContainer, div;

			chartContainer = document.createElement("div");
			chartContainer.setAttribute("id", "chartContainer");
			div = document.createElement("div");
			div.setAttribute("id", "myChart");
			div.setAttribute("class", "chart-container");
			chartContainer.appendChild(div);
			return chartContainer;
		}

		function axisSelector(selectorID, action, args) {
			var div = document.createElement("select"),
				option, i, column, storedColumn,
				xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
			        column_rendering, columns;

			if (xenaState) {
				columns = xenaState.column_order;
				column_rendering = xenaState.column_rendering;
			}

			if (xenaState && xenaState.chartState) {
				if (xenaState.cohort && (xenaState.cohort === xenaState.chartState.cohort)) {
					if (selectorID === "Xaxis") {
						storedColumn = xenaState.chartState.xcolumn;
					} else if (selectorID === "Yaxis") {
						storedColumn = xenaState.chartState.ycolumn;
					}
				}
			}

			div.setAttribute("id", selectorID);
			div.setAttribute("class", "dropdown-style");
			for (i = 0; i < columns.length; i++) {
				column = columns[i];
				option = document.createElement('option');
				option.value = column;
				option.textContent = column_rendering[column].columnLabel.user + " / " + column_rendering[column].fieldLabel.user;

				if (column_rendering[column].dataType === "geneMatrix") {
					option.textContent = option.textContent + " (gene average)";
				}
				div.appendChild(option);
				if (storedColumn && (column === storedColumn)) {
					div.selectedIndex = i;
				}
			}

			// x axis add an extra optioin: none -- summary view
			if (selectorID === "Xaxis") {
				i = columns.length;
				option = document.createElement('option');
				option.value = "none";
				option.textContent = "None (i.e. statistics of selected samples)";
				div.appendChild(option);
				if (storedColumn && ("none" === storedColumn)) {
					div.selectedIndex = i;
				}
				if (!storedColumn) { /// default to summary view
					div.selectedIndex = i;
				}
			}

			div.addEventListener('change', function () {
				update.apply(this, updateArgs);
			});
			return div;
		}

		function checkBoxDefault() {
			var dropDownDiv = document.getElementById("ynormalization"),
				xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
				dropdown = document.getElementById("Yaxis"),
				column = dropdown.options[dropdown.selectedIndex].value;

			//using xena heatmap default to set chart normalization default
			if (xenaState && xenaState.column_rendering[column].colnormalization) {
				dropDownDiv.selectedIndex = 1;
			} else {
				dropDownDiv.selectedIndex = 0;
			}
		}

		// obsolete function, for test setting colnormalization
		function setXenaColNormalizationState() {
			var dropDownDiv = document.getElementById("ynormalization"),
				xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
				dropdown = document.getElementById("Yaxis"),
				column = dropdown.options[dropdown.selectedIndex].value,
				colNormalization = dropDownDiv.options[dropDownDiv.selectedIndex].value;

			if (colNormalization === "none") {
				xenaState.column_rendering[column].colnormalization = false;
			} else {
				xenaState.column_rendering[column].colnormalization = true;
			}
			setStorage(xenaState);
		}

		function normalizationUIVisibility(visible) {
			var dropDown = document.getElementById("normDropDown");

			if (visible) {
				dropDown.style.visibility = "visible";
			} else {
				dropDown.style.visibility = "hidden";
			}
		}

		function update(cohort, samples) {
			var oldDiv = document.getElementById("chartContainer");
			rightContainer.replaceChild(buildEmptyChartContainer(), oldDiv);

			//initialization
			document.getElementById("myChart").innerHTML = "Querying Xena ...";
			normalizationUIVisibility(false);

			var dropdown, normUI, sdDropDown,
				xcolumn, ycolumn,
				xfields, yfields,
				xlabel, ylabel,
				xhost, yhost,
				xds, yds,
				xcolumnType, ycolumnType,
				column_rendering;

			dropdown = document.getElementById("Xaxis");
			xcolumn = dropdown.options[dropdown.selectedIndex].value;
			dropdown = document.getElementById("Yaxis");
			ycolumn = dropdown.options[dropdown.selectedIndex].value;
			normUI = document.getElementById("ynormalization");
			sdDropDown = document.getElementById("sdDropDown");



			// save state cohort, xcolumn, ycolumn
			var xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;
			if (xenaState) {
				xenaState.chartState = {
					"cohort": cohort,
					"xcolumn": xcolumn,
					"ycolumn": ycolumn
				};
				column_rendering = xenaState.column_rendering;
				setStorage(xenaState);
			}

			if (!((column_rendering[xcolumn] || xcolumn === "none") && column_rendering[ycolumn])) {
				document.getElementById("myChart").innerHTML = "Problem";
				return;
			}

			if (xcolumn !== "none") {
				xfields = column_rendering[xcolumn].fields;
				xlabel = column_rendering[xcolumn].fieldLabel.user;
				if (column_rendering[xcolumn].dataType === "geneMatrix") {
					xlabel = xlabel + " (gene average)";
				}
				xhost = JSON.parse(column_rendering[xcolumn].dsID).host;
				xds = JSON.parse(column_rendering[xcolumn].dsID).name;
				xcolumnType = column_rendering[xcolumn].dataType;
			} else {
				xlabel = "";
				xhost = JSON.parse(column_rendering[ycolumn].dsID).host;
			}

			yfields = column_rendering[ycolumn].fields;
			ylabel = column_rendering[ycolumn].fieldLabel.user;
			if (column_rendering[ycolumn].dataType === "geneMatrix") {
				ylabel = ylabel + " (gene average)";
			}

			yhost = JSON.parse(column_rendering[ycolumn].dsID).host;
			yds = JSON.parse(column_rendering[ycolumn].dsID).name;
			ycolumnType = column_rendering[ycolumn].dataType;

			if (xcolumnType === "mutationVector" || ycolumnType === "mutationVector") {
				document.getElementById("myChart").innerHTML = "x: " + xlabel + "; y:" + ylabel + " not implemented yet";
				return;
			}

			var source = Rx.Observable.zipArray(
				(xcolumn === "none") ? xenaQuery.test_host(xhost) : xenaQuery.code_list(xhost, xds, xfields),

				(xcolumn === "none") ? xenaQuery.test_host(xhost) : ((xcolumnType === "geneProbesMatrix") ?
					xenaQuery.dataset_gene_probe_values(xhost, xds, samples, xfields[0]) :
					((xcolumnType === "geneMatrix") ?
						xenaQuery.dataset_genes_values(xhost, xds, samples, xfields) :
						xenaQuery.dataset_probe_values(xhost, xds, samples, xfields))),


				xenaQuery.code_list(yhost, yds, yfields),

				(ycolumnType === "geneProbesMatrix") ?
				xenaQuery.dataset_gene_probe_values(yhost, yds, samples, yfields[0]) :
				((ycolumnType === "geneMatrix") ?
					xenaQuery.dataset_genes_values(yhost, yds, samples, yfields) :
					xenaQuery.dataset_probe_values(yhost, yds, samples, yfields))
			);

			source.subscribe(function (x) {
				var xcodemap = x[0],
					xdata,
					ycodemap = x[2],
					ydata,
					yIsCategorical, xIsCategorical, xfield,
					r,
				  offsets,
					yNormalization;

				if (xcolumn !== "none") {
					r = adjustData(xcolumnType, xfields, x[1]);
					xcolumnType = r[0];
					xfields = r[1];
					xdata = r[2];
				}

				r = adjustData(ycolumnType, yfields, x[3]);
				ycolumnType = r[0];
				yfields = r[1];
				ydata = r[2];

				// save state cohort, xcolumn, ycolumn, yfields,ycolumnType
				xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;
				if (xenaState) {
					xenaState.chartState = {
						"cohort": cohort,
						"xcolumn": xcolumn,
						"ycolumn": ycolumn,
						"yfields": yfields,
						"ycolumnType": ycolumnType
					};
					sessionStorage.xena = JSON.stringify(xenaState);
				}

				// single xfield only
				if (xfields && xfields.length > 1) {
					document.getElementById("myChart").innerHTML = "not applicable: x axis has more than one variable" +
						"<br>x: " + xlabel + " : " + xfields;
					return;
				}


				yIsCategorical = ycodemap[yfields[0]] ? true : false;
				xfield = xfields ? xfields[0] : undefined;
				xIsCategorical = xcodemap[xfield] ? true : false;

				// set sd whisker UI
				if (xIsCategorical && !yIsCategorical) {
					sdDropDown.style.visibility = "visible";
				} else {
					sdDropDown.style.visibility = "hidden";
				}

				// set y axis normalization UI
				normalizationUIVisibility(!yIsCategorical);
				if (yIsCategorical) {
					yNormalization = false;
				} else if (normUI.value === "none") {
					yNormalization = false;
				} else {
					yNormalization = normUI.value;
				}

				//need to get all the samples and all the data for y
				if (yNormalization === "cohort") {
					xenaQuery.dataset_samples(yhost, yds).subscribe(function (s) {
						var Observable = (ycolumnType === "geneProbesMatrix") ?
							xenaQuery.dataset_probe_values(yhost, yds, s, yfields) :
							((ycolumnType === "geneMatrix") ?
								xenaQuery.dataset_genes_values(yhost, yds, s, yfields) :
								xenaQuery.dataset_probe_values(yhost, yds, s, yfields));

						Observable.subscribe(function (results) {
							r = adjustData(ycolumnType, yfields, results);
							var allydata = r[2],
								i, k, datalist,
								offsets = {},
								yfield;

							for (i = 0; i < yfields.length; i++) {
								yfield = yfields[i];
								datalist = [];
								for (k = 0; k < allydata[i].length; k++) {
									if ('NaN' !== allydata[i][k]) {
										datalist.push(allydata[i][k]);
									}
								}
								offsets[yfield] = highcharts_helper.average(datalist);
							}
							drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel);
						});
					});
				} else if (yNormalization === "subset") {
					var i, k, datalist,
						yfield;

					offsets = {};
					for (i = 0; i < yfields.length; i++) {
						yfield = yfields[i];
						datalist = [];
						for (k = 0; k < ydata[i].length; k++) {
							if ('NaN' !== ydata[i][k]) {
								datalist.push(ydata[i][k]);
							}
						}
						offsets[yfield] = highcharts_helper.average(datalist);
					}
					drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel);
				} else {
					offsets = {};
					yfields.forEach(function (yfield) {
						offsets[yfield] = 0;
					});
					drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel);
				}
			});
		}


		function adjustData(columnType, fields, qReturn) {
			var data;
			if (columnType === "geneProbesMatrix") {
				data = qReturn[1];
				fields = qReturn[0];
				columnType = 'probeMatrix';
			} else if (columnType === "geneMatrix") {
				data = [];
				fields = [];
				qReturn.forEach(function (obj) {
					fields.push(obj.gene);
					data.push(obj.scores[0]);
				});
			} else {
				data = qReturn;
			}
			return [columnType, fields, data];
		}

		// returns key:array
		// categorical: key:array  ------  key is the category
		// float:  key: {xcode:array} key is the identifier, xcode is the xcode
		function parseYDataElement(yfield, ycodemap, ydataElement, samples, xcategories, xSampleCode) {
			var i, code,
				ybinnedSample = {};

			if (ycodemap[yfield]) { // y: categorical in matrix data
				ycodemap[yfield].forEach(function (code) {
					ybinnedSample[code] = [];
				});

				// probes by samples
				for (i = 0; i < ydataElement.length; i++) {
					code = ycodemap[yfield][ydataElement[i]];
					if (code) {
						ybinnedSample[code].push(samples[i]);
					}
				}

				// remove empty ycode categories
				ycodemap[yfield].forEach(function (code) {
					if (ybinnedSample[code].length === 0) {
						delete ybinnedSample[code];
					}
				});
			} else { // y: float in matrix data -- binned by xcode
				if (xcategories) {
					ybinnedSample[yfield] = {};
					xcategories.forEach(function (code) {
						ybinnedSample[yfield][code] = [];
					});
				} else {
					ybinnedSample[yfield] = [];
				}

				for (i = 0; i < ydataElement.length; i++) {
					if ('NaN' !== ydataElement[i]) {
						if (xSampleCode) {
							code = xSampleCode[samples[i]];
							if (code) {
								ybinnedSample[yfield][code].push(parseFloat(ydataElement[i]));
							}
						} else {
							ybinnedSample[yfield].push(parseFloat(ydataElement[i]));
						}
					}
				}
			}
			return ybinnedSample;
		}


		function drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel) {
			var chart,
				yIsCategorical = ycodemap[yfields[0]] ? true : false,
				xIsCategorical = xcodemap[xfield] ? true : false,
				chartOptions = _.clone(highcharts_helper.chartOptions), // chart option
				xAxisTitle, yAxisTitle,
				i, k,
				numSD = document.getElementById("sd").value;

			document.getElementById("myChart").innerHTML = "Generating chart ...";

			chartOptions.subtitle = {
				text: "cohort: " + cohort + " (n=" + samples.length + ")"
			};

			if (xIsCategorical && !yIsCategorical) { // x : categorical y float
				var xbinnedSample = {},
					xSampleCode = {},
					xCategories = [],
					dataMatrix = [], // row is x and column is y
					stdMatrix = [], // row is x and column is y
					code, row;

				// x data
				xcodemap[xfield].forEach(function (code) {
					xbinnedSample[code] = [];
				});

				//probes by samples
				for (i = 0; i < xdata[0].length; i++) {
					code = xcodemap[xfield][xdata[0][i]];
					if (code) {
						xbinnedSample[code].push(samples[i]);
						xSampleCode[samples[i]] = code;
					}
				}

				// remove empty xcode categories
				xcodemap[xfield].forEach(function (code) {
					if (xbinnedSample[code].length === 0) {
						delete xbinnedSample[code];
					} else {
						xCategories.push(code);
					}
				});

				// init average matrix std matrix // row is x by column y
				for (i = 0; i < xCategories.length; i++) {
					row = [];
					for (k = 0; k < yfields.length; k++) {
						row.push("");
					}
					dataMatrix.push(row);
					stdMatrix.push(_.clone(row));
				}

				// Y data and fill in the matrix
				var ybinnedSample, yfield, ydataElement,
					average, stdDev;

				for (k = 0; k < yfields.length; k++) {
					yfield = yfields[k];
					ydataElement = ydata[k];
					ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, samples, xCategories, xSampleCode);

					for (i = 0; i < xCategories.length; i++) {
						code = xCategories[i];
						if (ybinnedSample[yfield][code].length) {
							var data = ybinnedSample[yfield][code];

							average = highcharts_helper.average(data);
							stdDev = numSD * highcharts_helper.standardDeviation(data, average);

							if (!isNaN(average)) {
								dataMatrix[i][k] = parseFloat(average.toPrecision(3));
							} else {
								dataMatrix[i][k] = NaN;
							}
							if (!isNaN(stdDev)) {
								stdMatrix[i][k] = parseFloat(stdDev.toPrecision(3));
							} else {
								stdMatrix[i][k] = NaN;
							}
						}
					}
				}

				// column chart setup
				chartOptions = highcharts_helper.columnChartFloat(chartOptions, yfields, xlabel, ylabel, yIsCategorical);
				chart = new Highcharts.Chart(chartOptions);

				//add data seriese
				var showLegend = true,
					dataSeriese,
					errorSeries, offset,
					offsetsSeries = [];

				// offsets
				for (k = 0; k < yfields.length; k++) {
					yfield = yfields[k];
					offsetsSeries.push(offsets[yfield]);
				}

				for (i = 0; i < xCategories.length; i++) {
					code = xCategories[i],
						dataSeriese = (_.zip(dataMatrix[i], offsetsSeries)).map(function (value) {
							average = value[0];
							offset = value[1];
							if (!isNaN(average)) {
								return parseFloat((average - offset).toPrecision(3));
							} else {
								return "";
							}
						});
					errorSeries = (_.zip(dataMatrix[i], stdMatrix[i], offsetsSeries)).map(function (value) {
						average = value[0];
						stdDev = value[1];
						offset = value[2];
						if (!isNaN(average) && !isNaN(stdDev)) {
							return [parseFloat((average - stdDev - offset).toPrecision(3)),
								parseFloat((average + stdDev - offset).toPrecision(3))
							];
						} else {
							return ["", ""];
						}
					});

					highcharts_helper.addSeriesToColumn(
						chart, code, dataSeriese, errorSeries, yIsCategorical,
						yfields.length * xCategories.length < 30, showLegend);
				}
				chart.redraw();
			} else if (!xfield) { //summary view --- messsy code
				var ybinnedSample = {},
					dataSeriese = [],
					errorSeries = [],
					total = 0;

				xIsCategorical = true;

				for (k = 0; k < yfields.length; k++) {
					var yfield = yfields[k],
						ydataElement = ydata[k];

					if (yIsCategorical) { //  fields.length ==1
						ybinnedSample = parseYDataElement(
							yfield, ycodemap, ydataElement, samples, undefined, undefined);
					} else { // floats
						ybinnedSample[yfield] = parseYDataElement(
							yfield, ycodemap, ydataElement, samples, undefined, undefined)[yfield];
					}
				}

				var categories = Object.keys(ybinnedSample);
				if (yIsCategorical) {
					categories.forEach(function (code) {
						total = total + ybinnedSample[code].length;
					});
				}

				// column chart setup
				var categories = Object.keys(ybinnedSample),
					chartCategoryLabels = {};

				xAxisTitle = xlabel;

				categories.forEach(function (key) {
					chartCategoryLabels[key] = key + "<br>(n=" + ybinnedSample[key].length + ")";
				});

				var showLegend = false;
				chartOptions = highcharts_helper.columnChartOptions(
					chartOptions, categories, chartCategoryLabels, xAxisTitle, ylabel, yIsCategorical, showLegend)

				chart = new Highcharts.Chart(chartOptions);

				//add data to seriese
				categories.forEach(function (code) {
					if (yIsCategorical) {
						var value = ybinnedSample[code].length * 100 / total;
						dataSeriese.push(parseFloat(value.toPrecision(3)));
					} else {
						var average = highcharts_helper.average(ybinnedSample[code]);
						var stdDev = numSD * highcharts_helper.standardDeviation(ybinnedSample[code], average);
						if (!isNaN(average)) {
							dataSeriese.push(parseFloat((average - offsets[code]).toPrecision(3)));
						} else {
							dataSeriese.push("");
						}
						if (!isNaN(stdDev)) {
							errorSeries.push([parseFloat((average - offsets[code] - stdDev).toPrecision(3)),
								parseFloat((average - offsets[code] + stdDev).toPrecision(3))
							]);
						} else {
							errorSeries.push(["", ""]);
						}
					}
				});
				// add seriese to chart
				var seriesLabel;

				if (yIsCategorical) {
				  seriesLabel = " ";
				} else {
					seriesLabel = "average";
				}
				highcharts_helper.addSeriesToColumn(chart, seriesLabel,
					dataSeriese, errorSeries, yIsCategorical, categories.length < 30, showLegend);
				chart.redraw();

			} else if (xIsCategorical && yIsCategorical) { // x y : categorical --- messsy code
				var xbinnedSample = {},
					xSampleCode = {},
					code;

				// x data
				xcodemap[xfield].forEach(function (code) {
					xbinnedSample[code] = [];
				});

				//probes by samples
				for (i = 0; i < xdata[0].length; i++) {
					code = xcodemap[xfield][xdata[0][i]];
					if (code) {
						xbinnedSample[code].push(samples[i]);
						xSampleCode[samples[i]] = code;
					}
				}

				// remove empty xcode categories
				xcodemap[xfield].forEach(function (code) {
					if (xbinnedSample[code].length === 0) {
						delete xbinnedSample[code];
					}
				});

				// column chart setup
				var categories = Object.keys(xbinnedSample),
					chartCategoryLabels = {};

				xAxisTitle = xlabel;
				categories.forEach(function (key) {
					chartCategoryLabels[key] = key + "<br>(n=" + xbinnedSample[key].length + ")";
				});

				var showLegend = true;
				chartOptions = highcharts_helper.columnChartOptions(
					chartOptions, categories, chartCategoryLabels, xAxisTitle, ylabel, yIsCategorical, showLegend)

				chart = new Highcharts.Chart(chartOptions);

				// Y data
				for (k = 0; k < yfields.length; k++) {
					var yfield = yfields[k],
						ydataElement = ydata[k],
						ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, samples, categories, xSampleCode),
						ycategories = Object.keys(ybinnedSample),
						ycode, ycodeSeries;

					for (i = 0; i < ycategories.length; i++) {
						ycode = ycategories[i];
						ycodeSeries = [];

						categories.forEach(function (xcode) {
							var value;
							if (xbinnedSample[xcode].length) {
								value = (_.intersection(xbinnedSample[xcode], ybinnedSample[ycode]).length /
									xbinnedSample[xcode].length) * 100;
							}
							if (value) {
								ycodeSeries.push(parseFloat(value.toPrecision(3)));
							} else {
								ycodeSeries.push(" ");
							}
						});

						highcharts_helper.addSeriesToColumn(
							chart, ycode, ycodeSeries, errorSeries, yIsCategorical,
							ycodemap[yfields[0]].length * categories.length < 30, showLegend);
					}
				}
				chart.redraw();
			} else { // x y float
				// scatter chart setup
				xAxisTitle = xlabel;
				yAxisTitle = ylabel;

				chartOptions.legend.align = 'right';
				chartOptions.legend.verticalAlign = 'middle';
				chartOptions.legend.layout = 'vertical';

				chartOptions.chart.type = 'scatter';
				chartOptions.title = {
					text: ylabel + " vs " + xAxisTitle
				};
				chartOptions.xAxis = {
					title: {
						text: xAxisTitle
					},
					gridLineWidth: 1,
					minRange: 1
				};
				chartOptions.yAxis = {
					title: {
						text: yAxisTitle
					}
				};
				chartOptions.tooltip = {
					hideDelay: 0,
					pointFormat: '{point.name}<br>x: {point.x}<br>y:{point.y}'
				};
				chartOptions.plotOptions = {
					series: {
						turboThreshold: 0
					}
				};

				chart = new Highcharts.Chart(chartOptions);
				for (k = 0; k < yfields.length; k++) {
					var series = [],
						x, y;

					var yfield = yfields[k];
					for (i = 0; i < xdata[0].length; i++) {
						if (ycodemap[yfield]) { // y: categorical in matrix data
							document.getElementById("myChart").innerHTML = "x: " + xfield + "; y:" + ylabel + " not implemented";
							return;
						} else {
							x = xdata[0][i];
							y = ydata[k][i];
							if ('NaN' !== x && 'NaN' !== y) {
								y = y - offsets[yfield];
								series.push({
									name: samples[i],
									x: x,
									y: y
								});
							}
						}
					}
					chart.addSeries({
						name: yfield,
						data: series
					}, false);
				}
				chart.redraw();
			}

			if (chart) {
				toggleButtons(chart, xIsCategorical, yIsCategorical);
			}
		}

		function toggleButtons(chart, xIsCategorical, yIsCategorical) {
			var div = document.getElementById("chartContainer"),
				seriesButton, errorbarButton, datalabelButton,
				hideAll = "Hide all data",
				showAll = "Show all data",
				errorbarShow = "Show SD whiskers",
				errorbarHide = "Hide SD whiskers",
				errorbarShowTooltip = "Show standard deviation whiskers",
				errorbarHideTooltip = "Hide standard deviation whiskers",
				datalabelShow = "Show Y data labels",
				datalabelHide = "Hide Y data labels",
				dropDown = document.getElementById("sdDropDown");

			div.appendChild(document.createElement("br"));

			//showHideAllbutton
			seriesButton = document.createElement("button");
			seriesButton.setAttribute("class", "showHideButton");
			seriesButton.innerHTML = hideAll;
			seriesButton.addEventListener("click", function () {
				if (seriesButton.innerHTML === hideAll) { //hide all
					chart.series.forEach(function (series) {
						if (series.visible) {
							series.setVisible(false, false);
						}
					});
					seriesButton.innerHTML = showAll;
					chart.redraw();

				} else { /// show all
					if (chart.series.length < 20) {
						chart.series.forEach(function (series) {
							if (!series.visible) {
								series.setVisible(true, false);
							}
						});
						seriesButton.innerHTML = hideAll;
						chart.redraw();
					} else { //redraw from scratch
						update.apply(this, updateArgs);
					}
				}
			});
			div.appendChild(seriesButton);

			//showHideErrorBar
			if (xIsCategorical && !yIsCategorical) {
				errorbarButton = document.createElement("button");
				errorbarButton.setAttribute("class", "showHideButton");
				if (chart.series.some(function (series) {
						if (series.type === 'errorbar' && series.visible) {
							return true;
						}
					})) {
					errorbarButton.innerHTML = errorbarHide;
					errorbarButton.setAttribute("title", errorbarHideTooltip);
				} else {
					errorbarButton.innerHTML = errorbarShow;
					errorbarButton.setAttribute("title", errorbarShowTooltip);
				}

				errorbarButton.addEventListener("click", function () {
					if (errorbarButton.innerHTML === errorbarHide) { //hide
						chart.series.forEach(function (series) {
							if (series.type === 'errorbar') {
								series.setVisible(false, false);
							}
						});
						errorbarButton.innerHTML = errorbarShow;
						errorbarButton.setAttribute("title", errorbarShowTooltip);
						dropDown.style.visibility = "hidden";
					} else { /// show
						var i, series;
						for (i = 0; i < chart.series.length; i++) {
							series = chart.series[i];
							if (series.type === 'errorbar' && chart.series[i - 1].visible) {
								series.setVisible(true, false);
							}
						}
						errorbarButton.innerHTML = errorbarHide;
						errorbarButton.setAttribute("title", errorbarHideTooltip);
						dropDown.style.visibility = "visible";
					}
					chart.redraw();
				});
				div.appendChild(errorbarButton);
			}

			//showHideDataLabel button
			if (xIsCategorical) {
				datalabelButton = document.createElement("button");
				datalabelButton.setAttribute("class", "showHideButton");
				if (chart.series.some(function (series) {
						if (series.type !== 'errorbar' && series.options.dataLabels.enabled) {
							return true;
						}
					})) {
					datalabelButton.innerHTML = datalabelHide;
				} else {
					datalabelButton.innerHTML = datalabelShow;
				}
				datalabelButton.addEventListener("click", function () {
					if (datalabelButton.innerHTML === datalabelShow) {
						chart.series.forEach(function (series) {
							if (series.type !== 'errorbar') {
								series.update({
									dataLabels: {
										enabled: true
									}
								}, false);
								if (yIsCategorical) {
									series.update({
										dataLabels: {
											format: '{point.y} %'
										}
									}, false);
								}
							}
						});
						datalabelButton.innerHTML = datalabelHide;
					} else {
						chart.series.forEach(function (series) {
							series.update({
								dataLabels: {
									enabled: false
								}
							}, false);
						});
						datalabelButton.innerHTML = datalabelShow;
					}
					chart.redraw();
				});
				div.appendChild(datalabelButton);
			}
		}
	};
});
