'use strict';

var getLabel = require('./getLabel');
require('../css/chart.css');

var {hexToRGB, colorStr} = require ('./color_helper');
var d3 = require('d3-scale');
var domHelper = require('./dom_helper');
var highcharts = require('./highcharts');
var Highcharts = highcharts.Highcharts;
var highchartsHelper =  require ('./highcharts_helper');
var _ = require('./underscore_ext');
var colorScales = require ('./colorScales');
var customColors = {};

//project custom color code
//CKCC
/*
var customColors = {
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

module.exports = function (root, callback, sessionStorage) {
	var xdiv, ydiv, // x y and color axis dropdown
		colorDiv, colorElement,
		leftContainer, rightContainer,
		xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
		cohort, samplesLength, cohortSamples, updateArgs, update,
		normalizationState = {}, expState = {};

		if (xenaState)	{
			cohort = xenaState.cohort;
			samplesLength = xenaState.samples.length;
			cohortSamples = xenaState.cohortSamples;
		}
		updateArgs = [cohort, samplesLength, cohortSamples];

	function setStorage(state) {
		sessionStorage.xena = JSON.stringify(state);
		callback(['chart-set-state', state.chartState]);
	}

	function columnLabel (i, colSetting) {
		var label = colSetting.user.fieldLabel ;
		if (colSetting.fieldType === "genes") {
			label += " (gene average)";
		}
		return "column " + getLabel(i) + ": " + label;
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
			node = document.createElement("div");

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

		node.setAttribute("id", "sdDropDown");
		node.appendChild(document.createTextNode(" Whisker "));
		node.appendChild(dropDownDiv);
		return node;
	}

	function buildNormalizationDropdown() {
		var dropDownDiv, option,
			dropDown = [{
					"value": "none",
					"text": "off",
					"index": 0
				}, //no normalization
				{
					"value": "subset",
					"text": "subtract mean",
					"index": 1
				}, //selected sample level current heatmap normalization
				{
					"value": "subset_stdev",
					"text": "subtract mean, divide stdev (z-score)",
					"index": 2
				} //selected sample level current heatmap normalization
			],
			node = document.createElement("div");

		dropDownDiv = document.createElement("select");
		dropDownDiv.setAttribute("id", "ynormalization");
		dropDownDiv.setAttribute("class", "dropdown-style");

		dropDown.map(function (obj) {
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

		node.setAttribute("id", "normDropDown");
		node.appendChild(document.createTextNode(" Transform "));
		node.appendChild(dropDownDiv);
		return node;
	}

	function buildExpDropdown() {
		var dropDownDiv, option,
			dropDown = [{
					"value": "none",
					"text": "Log2 scale",
					"index": 0
				},
				{
					//convert x -> base-2 exponential value of x, for when viewing raw RNAseq data, xena typically converts RNAseq values into log2 space.
					"value": "exp2",
					"text": "off", // (effect: take base-2 exponential of the log scale value)",
					"index": 1
				},
			],
			node = document.createElement("div");

		dropDownDiv = document.createElement("select");
		dropDownDiv.setAttribute("id", "yExponentiation");
		dropDownDiv.setAttribute("class", "dropdown-style");

		dropDown.map(function (obj) {
			option = document.createElement('option');
			option.value = obj.value;
			option.textContent = obj.text;
			dropDownDiv.appendChild(option);
		});

		dropDownDiv.selectedIndex = 0;

		dropDownDiv.addEventListener('change', function () {
			expState[xenaState.chartState.ycolumn] = dropDownDiv.selectedIndex;
			update.apply(this, updateArgs);
		});

		node.setAttribute("id", "expDropDown");
		node.appendChild(document.createTextNode(" Log scale "));
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

	function colUnit (colSettings) {
		if (!colSettings.units) {
			return "";
		}
		return colSettings.units.join();
	}

	function axisSelector(selectorID) {
		var div, option, column, storedColumn,
			columns, columnOrder,
			data;

		if (xenaState) {
			columnOrder = xenaState.columnOrder;
			columns = xenaState.columns;
			data = xenaState.data;
		}

		if (xenaState && xenaState.chartState) {
			if (xenaState.cohort && (_.isEqual(xenaState.cohort, xenaState.chartState.cohort))) {
				if (selectorID === "Xaxis") {
					storedColumn = xenaState.chartState.xcolumn;
				} else if (selectorID === "Yaxis") {
					storedColumn = xenaState.chartState.ycolumn;
				} else if (selectorID === "scatterColor") {
					storedColumn = xenaState.chartState.colorColumn;
				}
			}
		}

		div = document.createElement("select");
		div.setAttribute("id", selectorID);
		div.setAttribute("class", "dropdown-style");

		// color dropdown add none option at the top
		if (selectorID === "Color") {
			// none -- no color at the beginning
			option = document.createElement('option');
			option.value = "none";
			option.textContent = "None";
			div.appendChild(option);
		}

		_.map(columnOrder, (column, i) => {
			if (column === "samples") {  //ignore samples column
				return;
			}
			if (columns[column].valueType === "mutation" || columns[column].valueType === "segmented" ) {  // to be implemented
				return;
			}
			if (data[column].status !== "loaded") { //bad column
				return;
			}
			if (data[column].req.values && data[column].req.values.length === 0) { //bad column
				return;
			}
			if (data[column].req.rows && data[column].req.rows.length === 0) { //bad column
				return;
			}
			if (data[column].codes && _.uniq(data[column].req.values[0]).length > 100) { // ignore any coded columns with too many items, like in most cases, the "samples" column
				return;
			}
			if ((selectorID === "Xaxis" || selectorID === "Color") &&
				data[column].req.values.length !== 1) {
				return;
			}

			option = document.createElement('option');
			option.value = column;
			option.textContent = [columnLabel(i, columns[column]), colUnit(columns[column])].join(" ");

			div.appendChild(option);
			if (column === storedColumn) {
				div.selectedIndex = div.length - 1;
			}
		});

		// x axis add none option at the end-- summary view
		if (selectorID === "Xaxis") {
			option = document.createElement('option');
			option.value = "none";
			option.textContent = "None";
			div.appendChild(option);

			if ("none" === storedColumn) {
				div.selectedIndex = div.length - 1;
			}
		}

		if (div.length === 0 ) {
			return;
		}

		// default settings
		// trying to use coded column for X and float column for y
		if (!storedColumn) {
			if (selectorID === "Xaxis") {
				div.selectedIndex = 0;
				for (let i = 0; i < div.length - 1; i++) {
					column = div.options[i].value;
					if (columns[column].valueType === "coded") {
						div.selectedIndex = i;
						break;
					}
				}

			} else if (selectorID === "Yaxis") {
				div.selectedIndex = div.length - 1;
				for (let i = 0; i < div.length; i++) {
					column = div.options[i].value;
					if (columns[column].valueType === "float") {
						div.selectedIndex = i;
						break;
					}
				}
			}
			if (selectorID === "Yaxis") {
				var xvalue = xdiv.options[xdiv.selectedIndex].value,
					yvalue = div.options[div.selectedIndex].value;

				if (xvalue === yvalue) {  // x and y axis is the same
					var i;
					for (i = 0; i < div.length; i++) {
						column = div.options[i].value;
						if (column !== xvalue) {
							div.selectedIndex = i;
							break;
						}
					}

					// no good choice for both x and y => set x to none -summary view
					if (i === div.length) {
						xdiv.options.selectedIndex = xdiv.options.length - 1;
					}
				}
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
			if (normalizationState[ycolumn] !== undefined) {
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
			dropDownDiv.selectedIndex = 0;
		}
	}

	function expUISetting(visible, ycolumn, colSettings) {
		var dropDown = document.getElementById("expDropDown"),
			dropDownDiv = document.getElementById("yExponentiation"),
			YdropDownDiv = document.getElementById("Yaxis"),
			i;

		if (visible) {
			var notLogScale = _.any(colSettings.units, unit => !unit || unit.search(/log/i) === -1);
			if (notLogScale) {
				dropDown.style.visibility = "hidden";
				dropDownDiv.selectedIndex === 0;
			}
			else {
				dropDown.style.visibility = "visible";

				//check current expState variable
				if (expState[ycolumn] !== undefined) {
					dropDownDiv.selectedIndex = expState[ycolumn];
				}
				else {
					dropDownDiv.selectedIndex = 0;
					expState[ycolumn] = 0;
				}
				//if data in db in logscale, custom option with actual unit
				if (dropDownDiv.selectedIndex === 0) {
					dropDownDiv.options[0].text = colSettings.units.join();
					i = YdropDownDiv.selectedIndex;
					YdropDownDiv.options[i].text = [columnLabel(i, colSettings), colUnit(colSettings)].join(" ");
				}
				// if exp2(data), custom y axis display without log in the unit label
				else {
					i = YdropDownDiv.selectedIndex;
					YdropDownDiv.options[i].text = columnLabel (i, colSettings);
					var unitsString = colUnit(colSettings);
					// remove log in unit label
					var regExp = /\(([^)]+)\)/;
					var matches = regExp.exec(unitsString);
					matches = matches ? matches[1] : '';
					YdropDownDiv.options[i].text = [YdropDownDiv.options[i].text, matches].join(" ");
				}
			}
		} else {
			dropDown.style.visibility = "hidden";
			dropDownDiv.selectedIndex === 0;
		}
	}

	function scatterColorUISetting(visible) {
		if (visible) {
			colorElement.style.visibility = "visible";
		} else {
			colorElement.style.visibility = "hidden";
		}
	}

	function sdDropdownUIsetting (visible) {
		var dropDown = document.getElementById("sdDropDown");
		if (visible) {
			dropDown.style.visibility = "visible";
		} else {
			dropDown.style.visibility = "hidden";
		}
	}


	// returns key:array
	// categorical: key:array  ------  key is the category
	// float:  key: {xcode:array} key is the identifier, xcode is the xcode
	function parseYDataElement(yfield, ycodemap, ydataElement, xcategories, xSampleCode) {
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
					ybinnedSample[code].push(i);
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
						code = xSampleCode[i];
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
	}

	function drawChart(cohort, samplesLength, xfield, xcodemap, xdata,
		yfields, ycodemap, ydata, reverseStrand,
		offsets, xlabel, ylabel, STDEV,
		scatterLabel, scatterColorData, scatterColorDataCodemap,
		samplesMatched) {
		var chart,
			yIsCategorical = ycodemap ? true : false,
			xIsCategorical = xcodemap ? true : false,
			chartOptions = _.clone(highchartsHelper.chartOptions),
			xAxisTitle,
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
			colors = {},
			average, stdDev;

		document.getElementById("myChart").innerHTML = "Generating chart ...";

		chartOptions.subtitle = {
			text: "cohort: " + _.pluck(cohort, 'name').join(' / ') + " (n=" + samplesLength + ")"
		};

		if (xIsCategorical && !yIsCategorical) { // x : categorical y float
			var xCategories = [],
				dataMatrix = [], // row is x and column is y
				stdMatrix = [], // row is x and column is y
				row,
				highlightcode = [],
				yDisplayFields;

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
					xbinnedSample[code].push(i);
					xSampleCode[i] = code;
				}
			}

			// remove empty xcode categories
			xcodemap.map(function (code) {
				if (xbinnedSample[code].length === 0) {
					delete xbinnedSample[code];
				} else {
					xCategories.push(code);
				}
			});

			// highlight categories identification : if all the samples in the category are part of the highlighted samples, the caterory will be highlighted
			if (samplesMatched && samplesMatched.length !== samplesLength) {
				xCategories.map(function (code) {
					if (xbinnedSample[code].every(sample => samplesMatched.indexOf(sample) !== -1)) {
						highlightcode.push(code);
					}
				});
			}

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
			for (k = 0; k < yfields.length; k++) {
				yfield = yfields[k];
				ydataElement = ydata[k];
				ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, xCategories, xSampleCode);

				for (i = 0; i < xCategories.length; i++) {
					code = xCategories[i];
					if (ybinnedSample[yfield][code].length) {
						var data = ybinnedSample[yfield][code];

						average = highchartsHelper.average(data);
						stdDev = numSD * highchartsHelper.standardDeviation(data, average);

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

			// column chart setup
			yDisplayFields = yfields.slice(0);
			if (reverseStrand) {
				yDisplayFields.reverse();
			}
			chartOptions = highchartsHelper.columnChartFloat(chartOptions, yDisplayFields, xlabel, ylabel);
			chart = new Highcharts.Chart(chartOptions);

			for (i = 0; i < xCategories.length; i++) {
				code = xCategories[i];
				dataSeriese = (_.zip(dataMatrix[i], offsetsSeries)).map(cutOffset);
				errorSeries = (_.zip(dataMatrix[i], stdMatrix[i], offsetsSeries)).map(getError);

				// highlight coloring
				if ( highlightcode.length !== 0 ) {
					if ( highlightcode.indexOf(code) !== -1) {
						colors[code] = 'gold';
					} else {
						colors[code] = "#A9A9A9";
					}
				}

				if (reverseStrand) {
					dataSeriese.reverse();
					errorSeries.reverse();
				}
				highchartsHelper.addSeriesToColumn(
					chart, code, dataSeriese, errorSeries, yIsCategorical,
					yfields.length * xCategories.length < 30, showLegend,
					customColors[code] ? customColors[code] : colors[code]);
			}
			chart.redraw();
		} else if (!xfield) { //summary view --- messsy code
			var total = 0,
				displayCategories;

			errorSeries = [];
			dataSeriese = [];
			ybinnedSample = {};
			xIsCategorical = true;

			for (k = 0; k < yfields.length; k++) {
				yfield = yfields[k];
				ydataElement = ydata[k];

				if (yIsCategorical) { //  fields.length ==1
					ybinnedSample = parseYDataElement(
						yfield, ycodemap, ydataElement, undefined, undefined);
				} else { // floats
					ybinnedSample[yfield] = parseYDataElement(
						yfield, ycodemap, ydataElement, undefined, undefined)[yfield];
				}
			}

			if (yIsCategorical) {
				categories = Object.keys(ybinnedSample);
				categories.forEach(function (code) {
					total = total + ybinnedSample[code].length;
				});
			} else {
				categories = yfields;
			}

			xAxisTitle = xlabel;
			showLegend = false;

			displayCategories = categories.slice(0);
			if (reverseStrand) {
				displayCategories.reverse();
			}
			if (yIsCategorical) {
				chartOptions = highchartsHelper.columnChartOptions(
					chartOptions, categories.map(code=> code + " (" + ybinnedSample[code].length + ")"), xAxisTitle, ylabel, showLegend);
			}
			else {
				chartOptions = highchartsHelper.columnChartFloat (chartOptions, displayCategories, xAxisTitle, ylabel);
			}
			chart = new Highcharts.Chart(chartOptions);

			//add data to seriese
			displayCategories.forEach(function (code) {
				if (yIsCategorical) {
					var value = ybinnedSample[code].length * 100 / total;
					dataSeriese.push(parseFloat(value.toPrecision(3)));
				} else {
					var average = highchartsHelper.average(ybinnedSample[code]);
					var stdDev = numSD * highchartsHelper.standardDeviation(ybinnedSample[code], average);
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
			highchartsHelper.addSeriesToColumn(chart, seriesLabel,
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
					if (xbinnedSample[code]) {
						xbinnedSample[code].push(i);
					} else {
						xbinnedSample[code] = [i];
					}
					xSampleCode[i] = code;
				}
			}

			// Y data: yfields can only have array size of 1
			yfield = yfields[0];
			ydataElement = ydata[0];
			ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, categories, xSampleCode);

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

			chartOptions = highchartsHelper.columnChartOptions(
				chartOptions, categories.map(code=> code + " (" + xbinnedSample[code].length + ")"),
				xAxisTitle, ylabel, showLegend);

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

				highchartsHelper.addSeriesToColumn(
					chart, code, ycodeSeries, errorSeries, yIsCategorical,
					ycodemap.length * categories.length < 30, showLegend,
					customColors[code] ? customColors[code] : colors[code]);
			}
			chart.redraw();
		} else { // x y float scatter plot
			var sampleLabels = _.flatten(cohortSamples),
				x, y;

			chartOptions = highchartsHelper.scatterChart(chartOptions, xlabel, ylabel);

			if (yfields.length > 1) { // y multi-subcolumns -- only happen with genomic y data
				//chartOptions.legend.title.text = ylabel;
				chart = new Highcharts.Chart(chartOptions);

				for (k = 0; k < yfields.length; k++) {
					var series = [];

					yfield = yfields[k];
					for (i = 0; i < xdata[0].length; i++) {
						x = xdata[0][i];
						y = ydata[k][i];
						if (null != x && null != y) {
							y = (y - offsets[yfield]) / STDEV[yfield];
							series.push({
								name: sampleLabels[i],
								x: x,
								y: y
							});
						}

					}
					chart.addSeries({
						name: yfield,
						data: series
					}, false);
				}
			} else { // y single subcolumn  --- coloring with a 3rd column
				var multiSeries = {},
					singleSeries = [], colorScale,
					highlightSeries = [],
					opacity = 0.6,
					colorCode, color, colorLabel,
					useMultiSeries = scatterColorDataCodemap || !scatterColorData ;

				function getCodedColor (code) {
					if ("null" === code) {
						var gray = {};
						gray.r = 150;
						gray.g = 150;
						gray.b = 150;
						gray.a = opacity;
						return colorStr(gray);
					}
					return colorStr(hexToRGB(colorScales.categoryMore[code % colorScales.categoryMore.length], opacity));
				}

				if (!useMultiSeries) {
					average = highchartsHelper.average(scatterColorData);
					stdDev = highchartsHelper.standardDeviation(scatterColorData, average);
					colorScale = d3.scaleLinear()
						.domain([average - 2 * stdDev, average, average + 2 * stdDev])
						.range(['blue', 'white', 'red']);
				}

				chartOptions.legend.title.text = "";
				chart = new Highcharts.Chart(chartOptions);

				yfield = yfields[0];
				for (i = 0; i < xdata[0].length; i++) {
					x = xdata[0][i];
					y = ydata[0][i];
					if (scatterColorData) {
						colorCode = scatterColorData[i];
					} else {
						colorCode = 0;
					}

					if (null != x && null != y && null != colorCode) {
						y = (y - offsets[yfield]) / STDEV[yfield];
						if (useMultiSeries ) { // use multi-seriese
							if (!multiSeries[colorCode]) {
								multiSeries[colorCode] = {
									"data": []
								};
							}
							multiSeries[colorCode].data.push({
								name: sampleLabels[i],
								x: x,
								y: y
							});
						} else {
							singleSeries.push({
								name: sampleLabels[i],
								x: x,
								y: y,
								color: colorScale (colorCode)
							});
						}

						if (samplesMatched && samplesLength !== samplesMatched.length &&
							samplesMatched.indexOf(i) !== -1) {
							highlightSeries.push({
								name: sampleLabels[i],
								x: x,
								y: y
							});
						}
					}
				}

				//add multi-series data
				_.keys(multiSeries).map(colorCode=>{
					if (scatterColorData) {
						color = customColors[colorCode] ? customColors[colorCode] : getCodedColor(colorCode);
						colorLabel = scatterColorDataCodemap[colorCode] || "null (no data)";
					} else {
						color = null;
						colorLabel = "sample";
					}

					chart.addSeries({
						name: colorLabel,
						data: multiSeries[colorCode].data,
						color: color
					}, false);
				});

				//add single-series data
				if (singleSeries.length) {
					chart.addSeries({
						name: "sample",
						data: singleSeries,
						marker: {
							opacity: 0.1
						}
					}, false);
				}

				// add highlightSeries color in gold with black border
				if (highlightSeries.length > 0 ) {
					chart.addSeries({
						name: "highlighted samples",
						data: highlightSeries,
						allowPointSelect: true,
						marker: {
							symbol: 'circle',
							radius: 4,
							lineColor: 'black',
							fillColor: 'gold',
							lineWidth: 1,
							states: {
								select: {
								   lineWidth: 2,
								   radius: 6,
								   fillColor: 'gold'
								}
							}
						}
					}, false);
				}
			}
			chart.redraw();
		}

		if (chart) {
			toggleButtons(chart, xIsCategorical, yIsCategorical);
		}
	}

	update = function () {
		var oldDiv = document.getElementById("chartContainer");
		rightContainer.replaceChild(buildEmptyChartContainer(), oldDiv);

		//initialization
		document.getElementById("myChart").innerHTML = "Querying Xena ...";
		normalizationUISetting(false);
		expUISetting(false);
		scatterColorUISetting(false);
		sdDropdownUIsetting(false);

		var xcolumn, ycolumn, colorColumn,
			xfields,
			xlabel, ylabel,
			columns,
			normUI = document.getElementById("ynormalization"),
			expUI = document.getElementById("yExponentiation"),
			XdropDownDiv = document.getElementById("Xaxis"),
			YdropDownDiv = document.getElementById("Yaxis");

		xcolumn = xdiv.options[xdiv.selectedIndex].value;
		ycolumn = ydiv.options[ydiv.selectedIndex].value;
		colorColumn = colorDiv.options[colorDiv.selectedIndex].value;

		// save state cohort, xcolumn, ycolumn, colorcolumn
		if (xenaState) {
			xenaState.chartState = {
				"cohort": cohort,
				"xcolumn": xcolumn,
				"ycolumn": ycolumn,
				"colorColumn": colorColumn
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
			xlabel = xdiv.options[xdiv.selectedIndex].text;
		} else {
			xlabel = "";
		}

		ylabel = ydiv.options[ydiv.selectedIndex].text;

		(function() {
			var xcodemap = _.getIn(xenaState, ['data', xcolumn, 'codes']),
				xdata = _.getIn(xenaState, ['data', xcolumn, 'req', 'values']),
				ycodemap = _.getIn(xenaState, ['data', ycolumn, 'codes']),
				ydata = _.getIn(xenaState, ['data', ycolumn, 'req', 'values']),
				yProbes = _.getIn(xenaState, ['data', ycolumn, 'req', 'probes']),
				yfields = yProbes ? yProbes : columns[ycolumn].fields,
				reverseStrand = false,
				samplesMatched = _.getIn(xenaState, ['samplesMatched']),
				yIsCategorical, xIsCategorical, xfield,
				offsets = {},  // per y variable
				STDEV = {},  // per y variable
				doScatter, scatterColorData, scatterColorDataCodemap, scatterLabel,
				yNormalization,
				yNormalizationMeta,
				yExponentiation;

			//reverse display if ycolumn is on - strand
			if (columns[ycolumn].strand && (columns[ycolumn].strand === '-' )) {
				reverseStrand = true;
			}
			// XXX normalization is broken in composite branch
			if (columns[ycolumn].defaultNormalization) {
				yNormalizationMeta = 1
				;
			} else {
				yNormalizationMeta = 0;
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
			sdDropdownUIsetting (xIsCategorical && !yIsCategorical);

			// set y axis normalization UI
			normalizationUISetting(!yIsCategorical, ycolumn, yNormalizationMeta);

			if (yIsCategorical) {
				yNormalization = false;
			} else if (normUI.value === "none") {
				yNormalization = false;
			} else {
				yNormalization = normUI.value;
			}

			// set y axis exponentiation UI
			expUISetting(!yIsCategorical, ycolumn, columns[ycolumn]);

			if (yIsCategorical) {
				yExponentiation = false;
			} else if (expUI.value === "none") {
				yExponentiation = false;
			} else {
				yExponentiation = expUI.value;
			}

			// y exponentiation
			if (yExponentiation === "exp2") {
				ydata =  _.map(ydata, d => _.map(d, x => (x != null) ? Math.pow(2, x) : null));
			}

			// set x and y labels based on axis and normalization UI selection
			if (xcolumn !== "none") {
				xlabel = XdropDownDiv.options[XdropDownDiv.selectedIndex].text;
			}
			ylabel = YdropDownDiv.options[YdropDownDiv.selectedIndex].text;
			if (normUI.options[normUI.selectedIndex].value === "subset") {
				ylabel = "mean-centered " + ylabel;
			} else if (normUI.options[normUI.selectedIndex].value === "subset_stdev") {
				ylabel = "z-tranformed " + ylabel;
			}

			// set scatterPlot coloring UI
			doScatter = !xIsCategorical && xfield && yfields.length === 1 ;
			scatterColorUISetting(doScatter);
			if (doScatter && colorColumn !== "none") {
				scatterColorData = _.getIn(xenaState, ['data', colorColumn, 'req', 'values'])[0];
				scatterColorDataCodemap = _.getIn(xenaState, ['data', colorColumn, 'codes']);
				scatterLabel = columns[colorColumn].user.fieldLabel;
			}

			//per y variable stdev
			var k, yfield;
			for (k = 0; k < yfields.length; k++) {
				yfield = yfields[k];
				if (yNormalization === "subset_stdev") {
					var ydataElement = ydata[k].filter(x => x != null);
					var allAve = highchartsHelper.average(ydataElement);
					var allSTDEV = highchartsHelper.standardDeviation(ydataElement, allAve);
					STDEV[yfield] = allSTDEV;
				} else {
					STDEV[yfield] = 1;
				}
			}

			var thunk = offsets => drawChart(cohort, samplesLength, xfield, xcodemap, xdata,
				yfields, ycodemap, ydata, reverseStrand,
				offsets, xlabel, ylabel, STDEV,
				scatterLabel, scatterColorData, scatterColorDataCodemap,
				samplesMatched);

			//offset
			if (yNormalization === "subset" || yNormalization === "subset_stdev") {
				offsets = _.object(yfields,
					_.map(ydata, d => highchartsHelper.average(_.filter(d, x => x != null))));
				callback(['chart-set-average', offsets, thunk]);
			} else {
				offsets = _.object(yfields, _.times(yfields.length, () => 0));
				callback(['chart-set-average', offsets, thunk]);
			}
		})();
	};

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
	leftContainer.appendChild(document.createElement("br"));
	xdiv = axisSelector("Xaxis", update, updateArgs);

	// y axis selector and Y value controls
	ydiv = axisSelector("Yaxis", update, updateArgs);
	if (!ydiv) {
		document.getElementById("myChart").innerHTML =
			"There is no plottable data, please add some by first clicking the \"Visual Spreadsheet\" button, then the \"+ Data\" button.";
		return;
	}

	// coloring on scatterplot
	colorDiv = axisSelector("Color", update, updateArgs);

	leftContainer.appendChild(domHelper.elt("div", "Y: ", ydiv, buildNormalizationDropdown(), buildExpDropdown()));
	leftContainer.appendChild(document.createElement("br"));

	leftContainer.appendChild(domHelper.elt("div", "X: ", xdiv));
	leftContainer.appendChild(document.createElement("br"));

	colorElement = domHelper.elt("div", "Color: ", colorDiv);
	leftContainer.appendChild(colorElement);
	leftContainer.appendChild(document.createElement("br"));

	// whisker is 1, 2, 3 SD
	rightContainer.appendChild(buildSDDropdown());

	update.apply(this, updateArgs);
};
