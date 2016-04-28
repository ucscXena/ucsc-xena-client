/*eslint camelcase: 0, no-use-before-define: 0 */
/*eslint-env browser */
/*global define: false, document: false */
'use strict';
define(['./fieldFetch', './xenaQuery', './dom_helper', './colorScales', './highcharts', './highcharts_helper', './underscore_ext'],
	function (fieldFetch, xenaQuery, dom_helper, colorScales, highcharts, highcharts_helper, _) {
	var Highcharts = highcharts.Highcharts;

	var custom_colors = {};

	//project custom color code
	//CKCC
	/*
	var custom_colors = {
		"IDHmut-codel":	"#00FFFF",
		"IDHmut-non-codel":	"#D47D4E",
		"IDHwt":	"#F5A9F2",
		"Proneural":	"#FFA500",
		"Neural":	"#0000FF",
		"Mesenchymal":	"#00FF00",
		"Classical":	"#FF0000",
		"G-CIMP":	"#9A2EFE"
	 };
	*/
	// PCAWG TERT custom color for
	/*
	var custom_colors ={
		"promoter mutation": "#1f77b4",
		"no mutation" : "#aec7e8"
	};
	*/

	return function (root, callback, sessionStorage) {
		var div,
			leftContainer, rightContainer, controlContainer,
			xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
			cohort, samples, updateArgs, normalizationState = {};

			if (xenaState)	{
				cohort = xenaState.cohort;
				samples = xenaState.samples;
			}
			updateArgs = [cohort, samples, normalizationState];

		function setStorage(state) {
			sessionStorage.xena = JSON.stringify(state);
			callback(['chart-set-state', state.chartState]);
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
						"text": "across cohort (subtract mean)",
						"index": 1
					}, //cohort-level
					{
						"value": "cohort_stdev",
						"text": "across cohort (subtract mean, divide stdev)",
						"index": 2
					},
					{
						"value": "subset",
						"text": "across selected samples (subtract mean)",
						"index": 3
					}, //selected sample level current heatmap normalization
					{
						"value": "subset_stdev",
						"text": "across selected samples (subtract mean, divide stdev)",
						"index": 4
					} //selected sample level current heatmap normalization
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
				normalizationState[xenaState.chartState.ycolumn] = dropDownDiv.selectedIndex;
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

		function axisSelector(selectorID) {
			var div = document.createElement("select"),
				option, i, column, storedColumn,
			  columns, columnOrder;

			if (xenaState) {
				columnOrder = xenaState.columnOrder;
				columns = xenaState.columns;
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
			for (i = 0; i < columnOrder.length; i++) {
				column = columnOrder[i];
				option = document.createElement('option');
				option.value = column;
				option.textContent = columns[column].user.fieldLabel;

				if (columns[column].fieldType === "genes") {
					option.textContent = option.textContent + " (gene average)";
				}
				div.appendChild(option);
				if (storedColumn && (column === storedColumn)) {
					div.selectedIndex = i;
				}
			}

			// x axis add an extra optioin: none -- summary view
			if (selectorID === "Xaxis") {
				i = columnOrder.length;
				option = document.createElement('option');
				option.value = "none";
				option.textContent = "None (i.e. summary view of the Y variable)";
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

		function normalizationUISetting(visible, ycolumn, yNormalizationMeta) {
			var dropDown = document.getElementById("normDropDown"),
				dropDownDiv = document.getElementById("ynormalization");

			if (visible) {
				dropDown.style.visibility = "visible";

				//check current normalizationState variable
				if (normalizationState[ycolumn] !== undefined){
					dropDownDiv.selectedIndex = normalizationState[ycolumn];
				}
				//intentionally not checking vizSettings, need to understand cursor first.
				//check meta data
				// The default column normalization is fetched from the server. Instead it should come from
				// the state, or from a data cache, because we've fetched that already.
				else {
					dropDownDiv.selectedIndex = yNormalizationMeta;
					normalizationState[ycolumn] = yNormalizationMeta;
				}
			} else {
				dropDown.style.visibility = "hidden";
			}
		}

		function update(cohort, samples) {
			var oldDiv = document.getElementById("chartContainer");
			rightContainer.replaceChild(buildEmptyChartContainer(), oldDiv);

			//initialization
			document.getElementById("myChart").innerHTML = "Querying Xena ...";
			normalizationUISetting(false);

			var dropdown, normUI, sdDropDown,
				xcolumn, ycolumn,
				xfields, yfields,
				xlabel, ylabel,
				xcolumnType, ycolumnType,
				columns;

			dropdown = document.getElementById("Xaxis");
			xcolumn = dropdown.options[dropdown.selectedIndex].value;
			dropdown = document.getElementById("Yaxis");
			ycolumn = dropdown.options[dropdown.selectedIndex].value;
			normUI = document.getElementById("ynormalization");
			sdDropDown = document.getElementById("sdDropDown");



			// save state cohort, xcolumn, ycolumn
			if (xenaState) {
				xenaState.chartState = {
					"cohort": cohort,
					"xcolumn": xcolumn,
					"ycolumn": ycolumn
				};
				columns = xenaState.columns;
				setStorage(xenaState);
			}

			if (!((columns[xcolumn] || xcolumn === "none") && columns[ycolumn])) {
				document.getElementById("myChart").innerHTML = "Problem";
				return;
			}

			if (xcolumn !== "none") {
				xfields = columns[xcolumn].fields;
				xlabel = columns[xcolumn].user.fieldLabel;
				if (columns[xcolumn].fieldType === "genes") {
					xlabel = xlabel + " (gene average)";
				}
				xcolumnType = columns[xcolumn].fieldType;
			} else {
				xlabel = "";
			}

			yfields = columns[ycolumn].fields;

			ylabel = columns[ycolumn].user.fieldLabel;
			if (columns[ycolumn].fieldType === "genes") {
				ylabel = ylabel + " (gene average)";
			}

			ycolumnType = columns[ycolumn].fieldType;

			if (xcolumnType === "mutation" || ycolumnType === "mutation") {
				document.getElementById("myChart").innerHTML = "x: " + xlabel + "; y:" + ylabel + " not implemented yet";
				return;
			}

			(function() {
				var xcodemap = _.getIn(xenaState, ['data', xcolumn, 'codes']),
					xdata = _.getIn(xenaState, ['data', xcolumn, 'req', 'values']),
					ycodemap = _.getIn(xenaState, ['data', ycolumn, 'codes']),
					ydata = _.getIn(xenaState, ['data', ycolumn, 'req', 'values']),
					yIsCategorical, xIsCategorical, xfield,
					offsets = {},  // per y variable
					STDEV = {},  // per y variable
					yNormalization,
					yNormalizationMeta;

				// XXX normalization is broken in composite branch
				if (columns[ycolumn].defaultNormalization) {
					yNormalizationMeta = 2;
				} else {
					yNormalizationMeta = 0;
				}

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


				yIsCategorical = ycodemap ? true : false;
				xfield = xfields ? xfields[0] : undefined;
				xIsCategorical = xcodemap ? true : false;

				// set sd whisker UI
				if (xIsCategorical && !yIsCategorical) {
					sdDropDown.style.visibility = "visible";
				} else {
					sdDropDown.style.visibility = "hidden";
				}

				// set y axis normalization UI
				normalizationUISetting(!yIsCategorical, ycolumn, yNormalizationMeta);

				if (yIsCategorical) {
					yNormalization = false;
				} else if (normUI.value === "none") {
					yNormalization = false;
				} else {
					yNormalization = normUI.value;
				}

				//per y variable stdev
				var k, yfield;
				for (k = 0; k < yfields.length; k++) {
					yfield = yfields[k];
					if (yNormalization === "cohort_stdev" || yNormalization === "subset_stdev"){
						var ydataElement = ydata[k].filter(x => x != null);

						var allAve = highcharts_helper.average(ydataElement);
						var allSTDEV = highcharts_helper.standardDeviation(ydataElement, allAve);
						STDEV[yfield] = allSTDEV;
					} else {
						STDEV[yfield] = 1;
					}
				}

				var thunk = offsets => drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel, STDEV);
				//offset
				if (yNormalization === "cohort" || yNormalization === "cohort_stdev" ) {
					callback(['chart-set-average-cohort', ycolumn, thunk]);
				} else if (yNormalization === "subset" || yNormalization === "subset_stdev") {
					offsets = _.object(yfields,
							_.map(ydata, d => highcharts_helper.average(_.filter(d, x => x != null))));

					callback(['chart-set-average', offsets, thunk]);
				} else {
					offsets = _.object(yfields, _.times(yfields.length, () => 0));
					callback(['chart-set-average', offsets, thunk]);
				}
			})();
		}

		// returns key:array
		// categorical: key:array  ------  key is the category
		// float:  key: {xcode:array} key is the identifier, xcode is the xcode
		function parseYDataElement(yfield, ycodemap, ydataElement, samples, xcategories, xSampleCode) {
			var i, code,
				ybinnedSample = {};

			if (ycodemap) { // y: categorical in matrix data
				ycodemap.forEach(function (code) {
					ybinnedSample[code] = [];
				});

				// probes by samples
				for (i = 0; i < ydataElement.length; i++) {
					code = ycodemap[ydataElement[i]];
					if (code) {
						ybinnedSample[code].push(samples[i]);
					}
				}

				// remove empty ycode categories
				ycodemap.forEach(function (code) {
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
					if (null != ydataElement[i]) {
						if (xSampleCode) {
							code = xSampleCode[samples[i]];
							if (code) {
								ybinnedSample[yfield][code].push(ydataElement[i]);
							}
						} else {
							ybinnedSample[yfield].push(ydataElement[i]);
						}
					}
				}
			}
			return ybinnedSample;
		}


		function drawChart(cohort, samples, xfield, xcodemap, xdata, yfields, ycodemap, ydata, offsets, xlabel, ylabel, STDEV) {
			var chart,
				yIsCategorical = ycodemap ? true : false,
				xIsCategorical = xcodemap ? true : false,
				chartOptions = _.clone(highcharts_helper.chartOptions),
				xAxisTitle, yAxisTitle,
				ybinnedSample,
				dataSeriese,
				errorSeries,
				yfield,
				ydataElement,
				showLegend,
				xbinnedSample,
				xSampleCode,
				code,
				categories,
				i, k,
				numSD = document.getElementById("sd").value,
				colors = {};

			document.getElementById("myChart").innerHTML = "Generating chart ...";

			chartOptions.subtitle = {
				text: "cohort: " + _.pluck(cohort, 'name').join(' / ') + " (n=" + samples.length + ")"
			};

			if (xIsCategorical && !yIsCategorical) { // x : categorical y float
				var xCategories = [],
					dataMatrix = [], // row is x and column is y
					stdMatrix = [], // row is x and column is y
					row;

				xSampleCode = {};
				xbinnedSample = {};
				// x data
				xcodemap.forEach(function (code) {
					xbinnedSample[code] = [];
				});

				//probes by samples
				for (i = 0; i < xdata[0].length; i++) {
					code = xcodemap[xdata[0][i]];
					if (code) {
						xbinnedSample[code].push(samples[i]);
						xSampleCode[samples[i]] = code;
					}
				}

				// remove empty xcode categories
				xcodemap.forEach(function (code) {
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
						row.push(NaN);
					}
					dataMatrix.push(row);
					stdMatrix.push(_.clone(row));
				}


				// Y data and fill in the matrix
				var average, stdDev;

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
								dataMatrix[i][k] = parseFloat((average / STDEV[yfield]).toPrecision(3));
							} else {
								dataMatrix[i][k] = NaN;
							}
							if (!isNaN(stdDev)) {
								stdMatrix[i][k] = parseFloat((stdDev / STDEV[yfield]).toPrecision(3));
							} else {
								stdMatrix[i][k] = NaN;
							}
						}
					}
				}

				// column chart setup
				chartOptions = highcharts_helper.columnChartFloat(chartOptions, yfields, xlabel, ylabel);
				chart = new Highcharts.Chart(chartOptions);

				//add data seriese
				var offsetsSeries = [],
					cutOffset,
					getError;

				showLegend = true;
				// offsets
				for (k = 0; k < yfields.length; k++) {
					yfield = yfields[k];
					offsetsSeries.push(offsets[yfield] / STDEV[yfield]);
				}

				cutOffset = function([average, offset]) {
					if (!isNaN(average)) {
						return parseFloat((average - offset).toPrecision(3));
					} else {
						return "";
					}
				};

				getError = function([average, stdDev, offset]) {
					if (!isNaN(average) && !isNaN(stdDev)) {
						return [parseFloat((average - stdDev - offset).toPrecision(3)),
							parseFloat((average + stdDev - offset).toPrecision(3))
						];
					} else {
						return ["", ""];
					}
				};

				xcodemap.forEach(function (code, i) {
					colors[code] = colorScales.categoryMore[i % colorScales.categoryMore.length];
				});

				for (i = 0; i < xCategories.length; i++) {
					code = xCategories[i];
					dataSeriese = (_.zip(dataMatrix[i], offsetsSeries)).map(cutOffset);
					errorSeries = (_.zip(dataMatrix[i], stdMatrix[i], offsetsSeries)).map(getError);

					//CKCC grey
					/*
					if (i===0){
						colors[code] = null;
					} else {
						colors[code] ="#A9A9A9";
					}
					*/

					highcharts_helper.addSeriesToColumn(
						chart, code, dataSeriese, errorSeries, yIsCategorical,
						yfields.length * xCategories.length < 30, showLegend,
						custom_colors[code] ? custom_colors[code] : colors[code]);
				}
				chart.redraw();
			} else if (!xfield) { //summary view --- messsy code
				var total = 0;
				errorSeries = [];
				dataSeriese = [];
				ybinnedSample = {};
				xIsCategorical = true;

				for (k = 0; k < yfields.length; k++) {
					yfield = yfields[k];
					ydataElement = ydata[k];

					if (yIsCategorical) { //  fields.length ==1
						ybinnedSample = parseYDataElement(
							yfield, ycodemap, ydataElement, samples, undefined, undefined);
					} else { // floats
						ybinnedSample[yfield] = parseYDataElement(
							yfield, ycodemap, ydataElement, samples, undefined, undefined)[yfield];
					}
				}

				categories = Object.keys(ybinnedSample);
				if (yIsCategorical) {
					categories.forEach(function (code) {
						total = total + ybinnedSample[code].length;
					});
				}

				xAxisTitle = xlabel;

				showLegend = false;
				if (yIsCategorical) {
				chartOptions = highcharts_helper.columnChartOptions(
					chartOptions, categories.map(code=> code + " (" + ybinnedSample[code].length + ")"), xAxisTitle, ylabel, showLegend);
				}
				else {
					chartOptions = highcharts_helper.columnChartFloat (chartOptions, categories, xAxisTitle, ylabel);
				}
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
							dataSeriese.push(parseFloat(((average - offsets[code]) / STDEV[code]).toPrecision(3)));
						} else {
							dataSeriese.push("");
						}
						if (!isNaN(stdDev)) {
							errorSeries.push([parseFloat(((average - offsets[code] - stdDev) / STDEV[code]).toPrecision(3)),
								parseFloat(((average - offsets[code] + stdDev) / STDEV[code]).toPrecision(3))
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
				//both x and Y is a single variable, i.e. yfields has array size of 1
				xSampleCode = {};
				xbinnedSample = {};

				// x data
				xcodemap.map(code=> xbinnedSample[code] = []);

				//probes by samples
				for (i = 0; i < xdata[0].length; i++) {
					code = xcodemap[xdata[0][i]];
					if (code) {
						if (xbinnedSample[code]){
							xbinnedSample[code].push(samples[i]);
						} else {
							xbinnedSample[code] = [samples[i]];
						}
						xSampleCode[samples[i]] = code;
					}
				}

				// Y data: yfields can only have array size of 1
				yfield = yfields[0];
				ydataElement = ydata[0];
				ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, samples, categories, xSampleCode);

				var ySamples = _.flatten(_.values(ybinnedSample));

				// remove empty xcode categories and recal xbinnedSample[code] with samples actually has values in Y
				xcodemap.forEach(function (code) {
					xbinnedSample[code] =  _.intersection(xbinnedSample[code], ySamples);
					if (xbinnedSample[code].length === 0) {
						delete xbinnedSample[code];
					}
				});

				// column chart setup
				categories = _.keys(xbinnedSample);

				xAxisTitle = xlabel;

				showLegend = true;

				chartOptions = highcharts_helper.columnChartOptions(
					chartOptions, categories.map(code=> code + " (" + xbinnedSample[code].length + ")"), xAxisTitle, ylabel, showLegend);

				chart = new Highcharts.Chart(chartOptions);

				var yFromCategories = function (ycode, xcode) {
					var value;
					if (xcode.length) {
						value = (_.intersection(xcode, ycode).length / xcode.length) * 100;
					}
					return value ? parseFloat(value.toPrecision(3)) : " ";
				};

				var ycategories = Object.keys(ybinnedSample);

				//code
				ycodemap.map((code, i) =>
					colors[code] = colorScales.categoryMore[i % colorScales.categoryMore.length]);

				var ycodeSeries;
				for (i = 0; i < ycategories.length; i++) {
					code = ycategories[i];

					ycodeSeries = _.map(_.map(categories, _.propertyOf(xbinnedSample)),
							_.partial(yFromCategories, ybinnedSample[code]));

					highcharts_helper.addSeriesToColumn(
						chart, code, ycodeSeries, errorSeries, yIsCategorical,
						ycodemap.length * categories.length < 30, showLegend,
						custom_colors[code] ? custom_colors[code] : colors[code]);
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

					yfield = yfields[k];
					for (i = 0; i < xdata[0].length; i++) {
						if (ycodemap) { // y: categorical in matrix data
							document.getElementById("myChart").innerHTML = "x: " + xfield + "; y:" + ylabel + " not implemented";
							return;
						} else {
							x = xdata[0][i];
							y = ydata[k][i];
							if (null != x && null != y) {
								y = (y - offsets[yfield]) / STDEV[yfield];
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

		root.setAttribute("id", "chartRoot");
		root.style.height = window.innerHeight + 'px';  /// best to do with css, but don't how to set the chart to full window height in css

		// left panel
		leftContainer = document.createElement("div");
		leftContainer.setAttribute("id", "left");
		root.appendChild(leftContainer);

		// right panel
		rightContainer = document.createElement("div");
		rightContainer.setAttribute("class", "rightContainer");
		root.appendChild(rightContainer);

		// chart container
		rightContainer.appendChild(buildEmptyChartContainer());

		if (!(xenaState && xenaState.cohort && xenaState.samples && xenaState.columnOrder.length > 0)) {
			document.getElementById("myChart").innerHTML =
				"There is no data, please add some by first clicking the \"Visual Spreadsheet\" button, then the \"+ Data\" button.";
			return;
		}

    // x axis selector
    div = dom_helper.elt("div", "X: ",
      axisSelector("Xaxis", update, updateArgs));
    div.setAttribute("id", "X");
    leftContainer.appendChild(div);

    // y axis selector
		div = dom_helper.elt("div", "Y: ",
			axisSelector("Yaxis", update, updateArgs));
		div.setAttribute("id", "Y");
		leftContainer.appendChild(div);

    //controls
		controlContainer = document.createElement("div");
		controlContainer.setAttribute("id", "controlContainer");
		rightContainer.appendChild(controlContainer);
		// normalization selection
		controlContainer.appendChild(buildNormalizationDropdown());
    // whisker is 1, 2, 3 SD
    controlContainer.appendChild(buildSDDropdown());
		update.apply(this, updateArgs);
	};
});
