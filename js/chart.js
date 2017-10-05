'use strict';

var getLabel = require('./getLabel');
var {hexToRGB, colorStr} = require ('./color_helper');
var d3 = require('d3-scale');
var Highcharts = require('highcharts/highstock');
require('highcharts/highcharts-more')(Highcharts);
var highchartsHelper =  require ('./highcharts_helper');
var _ = require('./underscore_ext');
var colorScales = require ('./colorScales');
var customColors = {};
var jStat = require('jStat').jStat;

// Styles
var compStyles = require('./chart.module.css');

var getCustomColor = (fieldSpecs, fields, datasets) =>
	(fieldSpecs.length === 1 && fields.length === 1) ?
		_.getIn(datasets, [fieldSpecs[0].dsID, 'customcolor', fieldSpecs[0].fields[0]], null) : null;

var chartHeight = () =>
	window.innerHeight * 0.7 + "px";

var chartWidth = () =>
	window.innerWidth * 0.7 + "px";

function render(root, callback, sessionStorage) {
	var xdiv, ydiv, xAxisDiv, yAxisDiv, // x y  axis dropdown
		colorDiv, colorAxisDiv, // color dropdown
		statsDiv, // statistics
		row, axisContainer,
		leftContainer, chartContainer,
		xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
		cohort, samplesLength, cohortSamples, updateArgs, update,
		normalizationState = {},
		expState = {},
		chart;

		if (xenaState)	{
			cohort = xenaState.cohort;
			samplesLength = xenaState.samples.length;
			cohortSamples = xenaState.cohortSamples;
			normalizationState = _.getIn(xenaState, ['chartState', 'normalizationState'], {});
			expState = _.getIn(xenaState, ['chartState', 'expState'], {});
		}
		updateArgs = [cohort, samplesLength, cohortSamples];

	function setStorage(state) {
		sessionStorage.xena = JSON.stringify(state);
		callback(['chart-set-state', state.chartState]);
	}

	function columnLabel (i, colSetting) {
		var	label = [colSetting.user.fieldLabel, colSetting.user.columnLabel].filter(e => e.trim() !== '').join(" - ");
		return "column " + getLabel(i) + ": " + label;
	}

	function buildNormalizationDropdown() {
		var dropDownDiv, option,
			dropDown = [{
					"value": "none",
					"text": "none",
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
			node = document.createElement("div"),
			labelDiv = document.createElement("label");

		dropDownDiv = document.createElement("select");
		dropDownDiv.setAttribute("id", "ynormalization");
		dropDownDiv.setAttribute("class", "form-control");

		dropDown.map(function (obj) {
			option = document.createElement('option');
			option.value = obj.value;
			option.textContent = obj.text;
			dropDownDiv.appendChild(option);
		});

		dropDownDiv.selectedIndex = 0;  //tocken, action in normalizationUISetting function

		dropDownDiv.addEventListener('change', function () {
			normalizationState[xenaState.chartState.ycolumn] = dropDownDiv.selectedIndex;
			update.apply(this, updateArgs);
		});

		node.className = compStyles.column;
		node.setAttribute("id", "normDropDown");
		labelDiv.appendChild(document.createTextNode("Y data linear transform "));
		node.appendChild(labelDiv);
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
					"text": "before log2 transformation", // (effect: take base-2 exponential of the log scale value)",
					"index": 1
				},
			],
			node = document.createElement("div"),
			labelDiv = document.createElement("label");

		dropDownDiv = document.createElement("select");
		dropDownDiv.setAttribute("id", "yExponentiation");
		dropDownDiv.setAttribute("class", "form-control");

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

		node.className = compStyles.column;
		node.setAttribute("id", "expDropDown");
		labelDiv.appendChild(document.createTextNode("Y data log transform "));
		node.appendChild(labelDiv);
		node.appendChild(dropDownDiv);
		return node;
	}

	function buildEmptyChartContainer() {
		var chartdiv = document.createElement("div");
		chartdiv.setAttribute("id", "myChart");
		chartdiv.style.height = chartHeight();
		chartdiv.style.width = chartWidth();
		return chartdiv;
	}

	function colUnit (colSettings) {
		if (!colSettings.units) {
			return "";
		}
		return colSettings.units.join();
	}

	function axisReview () {
		_.map(xdiv.options, option => option.disabled = false);
		_.map(ydiv.options, option => option.disabled = false);

		var data = _.getIn(xenaState, ['data']),
			xcolumn = xdiv.options[xdiv.selectedIndex].value,
			ycolumn = ydiv.options[ydiv.selectedIndex].value;

		// x single float, disable y multiple float of series > 2
		if (xcolumn !== "none" && !data[xcolumn].codes) {
			_.map(ydiv.options, option => {
				var y = option.value;
				if (data[y].req.values && data[y].req.values.length > 2) {
					option.disabled = true;
				}
			});
		}
		// if y is multiple float, disable x single float series > 2
		if (data[ycolumn].req.values && data[ycolumn].req.values.length > 2) {
			_.map(xdiv.options, option => {
				var x = option.value;
				if (x !== "none" && !data[x].codes) {
					option.disabled = true;
				}
			});
		}
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
				} else if (selectorID === "Color") {
					storedColumn = xenaState.chartState.colorColumn;
				}
			}
		}

		div = document.createElement("select");
		div.setAttribute("id", selectorID);
		div.className = "form-control";//"btn btn-default dropdown-toggle";

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
			if (columns[column].valueType === "mutation") { // to be implemented
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
				data[column].req.values && data[column].req.values.length !== 1) {
				return;
			}

			option = document.createElement('option');
			option.value = column;
			option.textContent = [columnLabel(i, columns[column]), colUnit(columns[column])].filter(e => e.trim() !== '').join(" - ");

			div.appendChild(option);

			if (column === storedColumn) {
				div.selectedIndex = div.length - 1;
			}
		});

		// x axis add none option at the end-- summary view
		if (selectorID === "Xaxis") {
			option = document.createElement('option');
			option.value = "none";
			option.textContent = "Histogram/Distribution";
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
				div.selectedIndex = div.length - 1;
				for (let i = 0; i < div.length - 1; i++) {
					column = div.options[i].value;
					if (columns[column].valueType === "coded") {
						div.selectedIndex = i;
						break;
					}
				}

			} else if (selectorID === "Yaxis") {
				div.selectedIndex = 0;
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

				if (xvalue !== "none" && !data[xvalue].codes && data[yvalue].req.values.length > 2) { // x if float and y is multi-float series with >2 series
					xdiv.options.selectedIndex = xdiv.options.length - 1;
					xvalue = "none";
				}

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

		var labelDiv = document.createElement("label"),
			listDiv = document.createElement("div"),
			returnDiv = document.createElement("div");

		if (selectorID === "Xaxis") {
			xdiv = div;
			labelDiv.appendChild(document.createTextNode("X axis"));
		} else if (selectorID === "Yaxis") {
			ydiv = div;
			labelDiv.appendChild(document.createTextNode("Y axis"));
		} else if (selectorID === "Color") {
			colorDiv = div;
			labelDiv.appendChild(document.createTextNode("Color"));
		}
		listDiv.appendChild(div);
		returnDiv.appendChild(labelDiv);
		returnDiv.appendChild(listDiv);
		returnDiv.className = compStyles.column;
		return returnDiv;
	}

	function normalizationUISetting(visible, ycolumn) {
		var dropDown = document.getElementById("normDropDown"),
			dropDownDiv = document.getElementById("ynormalization");

		if (visible) {
			dropDown.style.visibility = "visible";

			//check current normalizationState variable
			if (normalizationState[ycolumn] !== undefined) {
				dropDownDiv.selectedIndex = normalizationState[ycolumn];
			}
		} else {
			dropDown.style.visibility = "hidden";
		}
	}

	function expUISetting(visible, ycolumn, colSettings) {
		var dropDown = document.getElementById("expDropDown"),
			dropDownDiv = document.getElementById("yExponentiation"),
			YdropDownDiv = document.getElementById("Yaxis"),
			i = YdropDownDiv.selectedIndex,
			columnPos = xenaState.columnOrder.indexOf(ycolumn);

		if (visible) {
			var notLogScale = _.any(colSettings.units, unit => !unit || unit.search(/log/i) === -1);
			if (notLogScale) {
				dropDown.style.visibility = "hidden";
				dropDownDiv.selectedIndex === 0;
				dropDownDiv.value = "none";
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
					YdropDownDiv.options[i].text = [columnLabel(columnPos, colSettings), colUnit(colSettings)].filter(e => e.trim() !== '').join(" - ");
				}
				// if exp2(data), custom y axis display without log in the unit label
				else {
					var unitsString = colUnit(colSettings);
					// remove log in unit label
					var regExp = /\(([^)]+)\)/;
					var matches = regExp.exec(unitsString);
					matches = matches ? matches[1] : '';
					YdropDownDiv.options[i].text = [columnLabel(columnPos, colSettings), matches].filter(e => e.trim() !== '').join(" - ");
				}
			}
		} else {
			dropDown.style.visibility = "hidden";
			dropDownDiv.selectedIndex === 0;
			dropDownDiv.value = "none";
		}
	}

	function scatterColorUISetting(visible) {
		if (visible) {
			colorAxisDiv.style.visibility = "visible";
		} else {
			colorAxisDiv.style.visibility = "hidden";
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

	function destroy() {
		if (chart) {
			chart.destroy();
			chart = undefined;
		}
	}

	function drawChart(cohort, samplesLength, xfield, xcodemap, xdata,
		yfields, ycodemap, ydata, reverseStrand,
		offsets, xlabel, ylabel, STDEV,
		scatterLabel, scatterColorData, scatterColorDataCodemap,
		samplesMatched,
		columns, datasets, xcolumn, ycolumn, colorColumn) {
		var yIsCategorical = ycodemap ? true : false,
			xIsCategorical = xcodemap ? true : false,
			chartOptions = _.clone(highchartsHelper.chartOptions),
			xAxisTitle,
			ybinnedSample,
			dataSeriese,
			nNumberSeriese,
			yfield,
			ydataElement,
			showLegend,
			xbinnedSample,
			xSampleCode,
			code,
			categories,
			i, k,
			colors = {},
			average, stdDev,
			pValue, dof,
			total;

		destroy();
		document.getElementById("myChart").innerHTML = "Generating chart ...";

		chartOptions.subtitle = {
			text: "cohort: " + _.pluck(cohort, 'name').join(' / ') + " (n=" + samplesLength + ")"
		};

		if (xIsCategorical && !yIsCategorical) { // x : categorical y float
			var xCategories = [],
				meanMatrix = [],
				medianMatrix = [], // median row is x and column is y
				upperMatrix = [], // 75 percentile row is x and column is y
				lowerMatrix = [], // 25 percentile row is x and column is y
				upperwhiskerMatrix = [], // upperwhisker percentile row is x and column is y
				lowerwhiskerMatrix = [], // lowerwhisker percentile row is x and column is y
				stdMatrix = [], // row is x and column is y
				nNumberMatrix = [], // number of data points (real data points) for dataMatrix
				row,
				highlightcode = [];

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
				meanMatrix.push(_.clone(row));
				medianMatrix.push(_.clone(row));
				upperMatrix.push(_.clone(row));
				lowerMatrix.push(_.clone(row));
				upperwhiskerMatrix.push(_.clone(row));
				lowerwhiskerMatrix.push(_.clone(row));
				stdMatrix.push(_.clone(row));
				nNumberMatrix.push(_.clone(row));
			}

			// Y data and fill in the matrix
			for (k = 0; k < yfields.length; k++) {
				yfield = yfields[k];
				ydataElement = ydata[k];
				ybinnedSample = parseYDataElement(yfield, ycodemap, ydataElement, xCategories, xSampleCode);

				for (i = 0; i < xCategories.length; i++) {
					code = xCategories[i];
					if (ybinnedSample[yfield][code].length) {
						var data = ybinnedSample[yfield][code],
							m = data.length;

						data.sort((a, b) => a - b);
						average =  highchartsHelper.average(data);
						stdDev = highchartsHelper.standardDeviation(data, average);

						// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
						var median = data[Math.floor( m / 2)],
							lower =  data[Math.floor( m / 4)],
							upper =  data[Math.floor( 3 * m / 4)],
							whisker = 1.5 * (upper - lower),
							upperwhisker = _.findIndex(data, x => x > upper + whisker),
							lowerwhisker = _.findLastIndex(data, x => x < lower - whisker);

						upperwhisker = (upperwhisker === -1) ? data[data.length - 1 ] : data[upperwhisker - 1];
						lowerwhisker = (lowerwhisker === -1) ? data[0] : data[lowerwhisker + 1];

						meanMatrix[i][k] = parseFloat((average / STDEV[yfield]).toPrecision(3));
						medianMatrix[i][k] = parseFloat((median / STDEV[yfield]).toPrecision(3));
						lowerMatrix[i][k] = parseFloat((lower / STDEV[yfield]).toPrecision(3));

						upperMatrix[i][k] = parseFloat((upper / STDEV[yfield]).toPrecision(3));
						lowerwhiskerMatrix[i][k] = parseFloat((lowerwhisker / STDEV[yfield]).toPrecision(3));
						upperwhiskerMatrix[i][k] = parseFloat((upperwhisker / STDEV[yfield]).toPrecision(3));
						nNumberMatrix[i][k] = m;

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
				cutOffset;

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

			customColors = getCustomColor(columns[xcolumn].fieldSpecs, columns[xcolumn].fields, datasets);

			xcodemap.forEach(function (code, i) {
				colors[code] = colorScales.categoryMore[i % colorScales.categoryMore.length];
			});


			// column chart setup
			chartOptions = highchartsHelper.columnChartFloat(chartOptions, yfields, xlabel, ylabel);
			chart = new Highcharts.Chart(chartOptions);

			for (i = 0; i < xCategories.length; i++) {
				code = xCategories[i];
				// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
				var medianSeriese = (_.zip(medianMatrix[i], offsetsSeries)).map(cutOffset),
					upperSeriese = (_.zip(upperMatrix[i], offsetsSeries)).map(cutOffset),
					lowerSeriese = (_.zip(lowerMatrix[i], offsetsSeries)).map(cutOffset),
					upperwhiskerSeriese = (_.zip(upperwhiskerMatrix[i], offsetsSeries)).map(cutOffset),
					lowerwhiskerSeriese = (_.zip(lowerwhiskerMatrix[i], offsetsSeries)).map(cutOffset);

				nNumberSeriese = nNumberMatrix[i];

				// highlight coloring
				if ( highlightcode.length !== 0 ) {
					if ( highlightcode.indexOf(code) !== -1) {
						colors[code] = 'gold';
					} else {
						colors[code] = "#A9A9A9";
					}
				}

				dataSeriese = _.zip(lowerwhiskerSeriese, lowerSeriese, medianSeriese, upperSeriese, upperwhiskerSeriese);
				highchartsHelper.addSeriesToColumn(
					chart, 'boxplot', code,
					dataSeriese, yIsCategorical,
					yfields.length * xCategories.length < 30, showLegend,
					customColors && customColors[code] ? customColors[code] : colors[code],
					nNumberSeriese);
			}

			// p value when there is only 2 group comparison
			if (yfields.length === 1 && xCategories.length === 2 &&
				nNumberMatrix[0][0] > 1 && nNumberMatrix[1][0] > 1) {
				// do p value calculation using Welch's t-test
				var x1 = meanMatrix[0][0], // mean1
					x2 = meanMatrix[1][0], // mean2
					v1 = stdMatrix[0][0] * stdMatrix[0][0], //variance 1
					v2 = stdMatrix[1][0] * stdMatrix[1][0], //variance 2
					n1 = nNumberMatrix[0][0], // number 1
					n2 = nNumberMatrix[1][0], // number 2
					vCombined = v1 / n1 + v2 / n2, // pooled variance
					sCombined = Math.sqrt(vCombined), //pool sd
					tStatistics = (x1 - x2) / sCombined, // t statistics,
					cdf;

				dof = vCombined * vCombined / ((v1 / n1) * (v1 / n1) / (n1 - 1) + (v2 / n2) * (v2 / n2) / (n2 - 1)), // degree of freedom
				cdf = jStat.studentt.cdf(tStatistics, dof),
				pValue = 2 * (cdf > 0.5 ? (1 - cdf) : cdf);

				statsDiv.innerHTML = 'Welch\'s t-test<br>' +
					't = ' + tStatistics.toPrecision(4) + '<br>' +
					'p = ' + pValue.toPrecision(4);
				statsDiv.classList.toggle(compStyles.visible);
			}
			chart.redraw();
		} else if (!xfield) { //summary view --- messsy code
			var displayCategories;

			dataSeriese = [];
			nNumberSeriese = [];
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

			total = 0;
			if (yIsCategorical) {
				categories = Object.keys(ybinnedSample);
				categories.forEach(function (code) {
					total = total + ybinnedSample[code].length;
				});
			} else {
				categories = yfields;
			}

			// single parameter float do historgram with smart tick marks
			if (!yIsCategorical && yfields.length === 1) {
				var valueList = _.values(ybinnedSample)[0],
					offset = _.values(offsets)[0],
					stdev = _.values(STDEV)[0];

				valueList.sort((a, b) => a - b);

				var min = valueList[0],
					max = valueList[valueList.length - 1],
					N = 20,
					gap = (max - min) / (N * stdev),
					gapRoundedLower =  Math.pow(10, Math.floor(Math.log(gap) / Math.LN10)), // get a sense of the scale the gap, 0.01, 0.1, 1, 10 ...
					gapList = [gapRoundedLower, gapRoundedLower * 2, gapRoundedLower * 5, gapRoundedLower * 10], // within the scale, find the closet to this list of easily readable intervals 1,2,5,10
					gapRounded = _.min(gapList, x => Math.abs(gap - x )),
					maxRounded = Math.ceil((max - offset) / stdev / gapRounded) * gapRounded,
					minRounded = Math.floor((min - offset) / stdev / gapRounded) * gapRounded;

				categories = _.range(minRounded, maxRounded, gapRounded);
				categories = categories.map( bin =>
					(Math.floor(bin * 100) / 100) + ' to ' + (Math.floor((bin + gapRounded) * 100) / 100));
				ybinnedSample = {};
				categories.map(bin => ybinnedSample[bin] = 0);
				valueList.map( value => {
					var binIndex = Math.floor(((value - offset) / stdev - minRounded) / gapRounded),
						bin = categories[binIndex];
					ybinnedSample[bin] = ybinnedSample[bin] + 1;
				});
			}

			xAxisTitle = xlabel;
			showLegend = false;

			displayCategories = categories.slice(0);
			if (yIsCategorical) {
				chartOptions = highchartsHelper.columnChartOptions(
					chartOptions, categories.map(code=> code + " (" + ybinnedSample[code].length + ")"),
					xAxisTitle, "Distribution", ylabel, showLegend);
			} else if (yfields.length === 1) {
				chartOptions = highchartsHelper.columnChartOptions(
					chartOptions, categories, xAxisTitle, "Histogram", ylabel, showLegend);
			}
			else {
				if (reverseStrand) {
					displayCategories.reverse();
				}
				chartOptions = highchartsHelper.columnChartFloat (chartOptions, displayCategories, xAxisTitle, ylabel);
			}
			chart = new Highcharts.Chart(chartOptions);

			//add data to seriese
			displayCategories.forEach(function (code) {
				var value;
				if (yIsCategorical) {
					value = ybinnedSample[code].length;
					dataSeriese.push(parseFloat((value * 100 / total).toPrecision(3)));
					nNumberSeriese.push(value);
				} else if (yfields.length === 1) {
					value = ybinnedSample[code];
					dataSeriese.push(value);
				} else {
					var data = ybinnedSample[code],
						m = data.length;
					data.sort((a, b) => a - b);
					average = highchartsHelper.average(data);
					stdDev = highchartsHelper.standardDeviation(data, average);

					// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
					var median = data[Math.floor( m / 2)],
						lower =  data[Math.floor( m / 4)],
						upper =  data[Math.floor( 3 * m / 4)],
						whisker = 1.5 * (upper - lower),
						upperwhisker = _.findIndex(data, x => x > upper + whisker),
						lowerwhisker = _.findLastIndex(data, x => x < lower - whisker);

					upperwhisker = (upperwhisker === -1) ? data[data.length - 1 ] : data[upperwhisker - 1];
					lowerwhisker = (lowerwhisker === -1) ? data[0] : data[lowerwhisker + 1];

					median = parseFloat(((median - offsets[code]) / STDEV[code]).toPrecision(3));
					lower = parseFloat(((lower - offsets[code]) / STDEV[code]).toPrecision(3));
					upper = parseFloat(((upper - offsets[code]) / STDEV[code]).toPrecision(3));
					upperwhisker = parseFloat(((upperwhisker - offsets[code]) / STDEV[code]).toPrecision(3));
					lowerwhisker = parseFloat(((lowerwhisker - offsets[code]) / STDEV[code]).toPrecision(3));

					dataSeriese.push([lowerwhisker, lower, median, upper, upperwhisker]);
					nNumberSeriese.push(m);
				}
			});
			// add seriese to chart
			var seriesLabel, chartType;

			if (yIsCategorical) {
				seriesLabel = " ";
				chartType = 'column';
			} else if (yfields.length === 1) {
				seriesLabel = " ";
				chartType = 'line';
			} else {
				seriesLabel = "average";
				chartType = 'boxplot';
			}
			highchartsHelper.addSeriesToColumn(chart, chartType, seriesLabel,
				dataSeriese, yIsCategorical, categories.length < 30, showLegend,
				0, nNumberSeriese);
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
				xAxisTitle, 'Distribution', ylabel, showLegend);

			chart = new Highcharts.Chart(chartOptions);

			var ycategories = Object.keys(ybinnedSample);

			//code
			customColors = getCustomColor(columns[ycolumn].fieldSpecs, columns[ycolumn].fields, datasets);

			ycodemap.map((code, i) =>
				colors[code] = colorScales.categoryMore[i % colorScales.categoryMore.length]);

			// Pearson's chi-squared test pearson https://en.wikipedia.org/wiki/Pearson's_chi-squared_test
			// note, another version of pearson's chi-squared test is G-test, Likelihood-ratio test, https://en.wikipedia.org/wiki/Likelihood-ratio_test
			var observed = [],
				expected = [],
				xRatio = [],
				xMargin = [],
				yMargin = [];

			total = 0.0;
			for (i = 0; i < ycategories.length; i++) {
				code = ycategories[i];
				observed.push(new Array(categories.length));
				expected.push(new Array(categories.length));
				yMargin.push(ybinnedSample[code].length);
				total += yMargin[i];
			}
			// fill expected matrix
			for (k = 0; k < categories.length; k++) {
				code = categories[k];
				xMargin.push(xbinnedSample[code].length);
				xRatio.push(xMargin[k] / total);
			}
			for (i = 0; i < ycategories.length; i++) {
				code = ycategories[i];
				for (k = 0; k < categories.length; k++) {
					observed[i][k] = _.intersection(ybinnedSample[code], xbinnedSample[categories[k]]).length;
					expected[i][k] = xRatio[k] * yMargin[i];
				}
			}

			for (i = 0; i < ycategories.length; i++) {
				code = ycategories[i];
				var ycodeSeries = new Array(categories.length);
				for (k = 0; k < categories.length; k++) {
					if (xMargin[k] && observed[i][k]) {
						ycodeSeries[k] = parseFloat(((observed[i][k] / xMargin[k]) * 100).toPrecision(3));
					} else {
						ycodeSeries[k] = 0;
					}
				}

				highchartsHelper.addSeriesToColumn(
					chart, 'column', code, ycodeSeries, yIsCategorical,
					ycodemap.length * categories.length < 30, showLegend,
					customColors && customColors[code] ? customColors[code] : colors[code], observed[i]);
			}

			// pearson chi-square test statistics
			dof = (ycategories.length - 1) * (categories.length - 1);
			if (dof) {
				var chisquareStats = 0.0;

				for (i = 0; i < ycategories.length; i++) {
					for (k = 0; k < categories.length; k++) {
						chisquareStats += Math.pow((observed[i][k] - expected[i][k]), 2) / expected[i][k];
					}
				}

				pValue = 1 - jStat.chisquare.cdf( chisquareStats, dof);
				statsDiv.innerHTML = 'Pearson\'s chi-squared test<br>' +
						'χ2 = ' + chisquareStats.toPrecision(4) + '<br>' +
						'p = ' + pValue.toPrecision(4);
				statsDiv.classList.toggle(compStyles.visible);
			}

			chart.redraw();
		} else { // x y float scatter plot
			var sampleLabels = _.flatten(cohortSamples),
				x, y;

			chartOptions = highchartsHelper.scatterChart(chartOptions, xlabel, ylabel, samplesLength);

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

				// pearson rho value when there is only single series x y scatter plot
				if (yfields.length === 1 && xdata[0].length > 1) {
					//Pearson's Rho p value
					var xlist = _.filter(xdata[0], function (x, i) {return (x != null && ydata[0][i] != null);});
					var ylist = _.filter(ydata[0], function (y, i) {return (y != null && xdata[0][i] != null);});
					var rho = jStat.corrcoeff(xlist, ylist); // r Pearson's Rho correlation coefficient
					var spearmanRho = jStat.spearmancoeff(xlist, ylist); // (spearman's) rank correlation coefficient, rho
					statsDiv.innerHTML = 'Pearson\'s rho<br>' +
						'r = ' + rho.toPrecision(4) + '<br>' +
						'Spearman\'s rank rho<br>' +
						'ρ = ' + spearmanRho.toPrecision(4);
					statsDiv.classList.toggle(compStyles.visible);
				}


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
								colorLabel: scatterColorDataCodemap ?
									(scatterColorDataCodemap[colorCode] || "null (no data)") : '',
								name: sampleLabels[i],
								x: x,
								y: y
							});
						} else {
							singleSeries.push({
								colorLabel: scatterColorData[i],
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
				if (colorColumn !== "none") {
					customColors = getCustomColor(columns[colorColumn].fieldSpecs, columns[colorColumn].fields, datasets);
				}

				_.keys(multiSeries).map(colorCode=>{
					if (scatterColorData) {
						colorLabel = scatterColorDataCodemap[colorCode] || "null (no data)";
						color = customColors && customColors[colorLabel] ? customColors[colorLabel] : getCodedColor(colorCode);

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
						name: scatterColorData ? columns[colorColumn].user.fieldLabel : "sample",
						data: singleSeries,
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
							lineColor: 'black',
							fillColor: 'gold',
							lineWidth: 1,
						}
					}, false);
				}
			}
			chart.redraw();
		}
	}

	update = function () {
		var oldDiv = document.getElementById("myChart");
		oldDiv.parentElement.replaceChild(buildEmptyChartContainer(), oldDiv);
		statsDiv.innerHTML = "";
		statsDiv.classList.toggle(compStyles.visible, false);

		//initialization
		document.getElementById("myChart").innerHTML = "Querying Xena ...";
		normalizationUISetting(false);
		expUISetting(false);
		scatterColorUISetting(false);

		var xcolumn, ycolumn, colorColumn,
			xfields,
			xlabel, ylabel,
			columns, datasets,
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
				"colorColumn": colorColumn,
				"normalizationState": normalizationState,
				"expState": expState
			};
			columns = xenaState.columns;
			datasets = xenaState.datasets;
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
				xdataSegment = _.getIn(xenaState, ['data', xcolumn, 'req', 'rows']),
				ycodemap = _.getIn(xenaState, ['data', ycolumn, 'codes']),
				ydata = _.getIn(xenaState, ['data', ycolumn, 'req', 'values']),
				ydataSegment = _.getIn(xenaState, ['data', ycolumn, 'req', 'rows']),
				yProbes = _.getIn(xenaState, ['data', ycolumn, 'req', 'probes']),
				yfields = yProbes ? yProbes :
					((['segmented', 'mutation', 'SV'].indexOf(columns[ycolumn].fieldType) !== -1) ? [columns[ycolumn].fields[0]] : columns[ycolumn].fields),
				reverseStrand = false,
				samplesMatched = _.getIn(xenaState, ['samplesMatched']),
				yIsCategorical, xIsCategorical, xfield,
				offsets = {},  // per y variable
				STDEV = {},  // per y variable
				doScatter, scatterLabel,
				scatterColorData, scatterColorDataCodemap, scatterColorDataSegment,
				yNormalization,
				yExponentiation;

			// convert segment data to matrix data
			if (ydataSegment) {
				ydata = _.getIn(xenaState, ['data', ycolumn, 'avg', 'geneValues']);
			}
			if (xdataSegment) {
				xdata = _.getIn(xenaState, ['data', xcolumn, 'avg', 'geneValues']);
			}

			//convert binary float to categorical data
			if (!xcodemap && xdata && _.flatten(xdata).every(c =>_.indexOf([0, 1], c) !== -1 || c == null)) {
				xcodemap = ["0", "1"];
			}
			if (!ycodemap && ydata && _.flatten(ydata).every(c =>_.indexOf([0, 1], c) !== -1 || c == null)) {
				ycodemap = ["0", "1"];
			}

			//reverse display if ycolumn is on - strand
			if (columns[ycolumn].strand && (columns[ycolumn].strand === '-' )) {
				reverseStrand = true;
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

			// set y axis normalization UI
			normalizationUISetting(!yIsCategorical, ycolumn);

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
				scatterColorData = _.getIn(xenaState, ['data', colorColumn, 'req', 'values']);
				scatterColorDataSegment = _.getIn(xenaState, ['data', colorColumn, 'req', 'rows']);
				scatterColorDataCodemap = _.getIn(xenaState, ['data', colorColumn, 'codes']);
				scatterLabel = columns[colorColumn].user.fieldLabel;

				if (scatterColorDataSegment) {
					scatterColorData = _.getIn(xenaState, ['data', colorColumn, 'avg', 'geneValues']);
				}
				scatterColorData = scatterColorData[0];
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
				samplesMatched, columns, datasets, xcolumn, ycolumn, colorColumn);

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
		axisReview();
	};

	// right panel chart
	chartContainer = document.createElement("div");
	chartContainer.appendChild(buildEmptyChartContainer());
	root.appendChild(chartContainer);

	// statistics
	statsDiv = document.createElement("div");
	statsDiv.className = compStyles.stats;
	chartContainer.appendChild(statsDiv);

	// left panel control
	leftContainer = document.createElement("div");
	leftContainer.setAttribute("id", "controlPanel");
	leftContainer.className = compStyles.controlPanel;
	leftContainer.style.width = chartWidth();
	root.appendChild(leftContainer);

	if (!(xenaState && xenaState.cohort && xenaState.samples && xenaState.columnOrder.length > 0)) {
		document.getElementById("myChart").innerHTML =
			"There is no data, please add some by first clicking the \"Visual Spreadsheet\" button, then the \"+ Data\" button.";
		return;
	}

	axisContainer = document.createElement("div");

	// x axis
	xAxisDiv = axisSelector("Xaxis", update, updateArgs);

	// y axis selector and Y value controls
	yAxisDiv = axisSelector("Yaxis", update, updateArgs);
	if (!ydiv) {
		document.getElementById("myChart").innerHTML =
			"There is no plottable data, please add some by first clicking the \"Visual Spreadsheet\" button, then the \"+ Data\" button.";
		return;
	}
	row = document.createElement("div");
	row.className = compStyles.row;
	row.appendChild(yAxisDiv);
	axisContainer.appendChild(row);

	//mean z
	row.appendChild(buildNormalizationDropdown());
	axisContainer.appendChild(row);

	//log
	row.appendChild(buildExpDropdown());
	axisContainer.appendChild(row);

	//x
	row = document.createElement("div");
	row.className = compStyles.row;
	row.appendChild(xAxisDiv);
	axisContainer.appendChild(row);

	// color
	colorAxisDiv = axisSelector("Color", update, updateArgs);
	row = document.createElement("div");
	row.className = compStyles.row;
	row.appendChild(colorAxisDiv);
	axisContainer.appendChild(row);

	leftContainer.appendChild(axisContainer);

	update.apply(this, updateArgs);
	return destroy;
};

module.exports = {render, chartHeight, chartWidth};
