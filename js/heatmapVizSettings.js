/*jshint browser: true */
/*global define: false, document: false */

// Config UI for custom viz settings for heatmaps.
//
// State schema. This is the goal, not the current implementation. If
// the user has never modified the default settings, vizSettings is undefined.
//
// When the user modifies colNormalization or color parameters, they are
// written into vizSettings. vizSettings can have normalization or color
// parameters, or both. All color parameters are present if any are set.
// The minStart/maxStart are optional, so may be null if other color parameters
// are set.
//
// vizSettings = undefined |
//               {
//                 colNormalization: 'subset' | 'none'
//               } |
//               {
//                 min: float,
//                 minStart: float | null,
//                 maxStart: float | null,
//                 max: float
//               } |
//               {
//                 colNormalization: 'subset' | 'none'
//                 min: float,
//                 minStart: float | null,
//                 maxStart: float | null,
//                 max: float
//               }

// Refactoring notes:
// The default column normalization is fetched from the server. Instead it should come from
// the state, or from a data cache, because we've fetched that already.
define(['xenaQuery', 'dom_helper', 'session', 'underscore_ext', '../images/genomicFloatLegend.jpg','../images/genomicCustomFloatLegend.jpg','jquery', 'jquery-ui'],
	function (xenaQuery, dom_helper, session, _, floatImg, customFloatImg, $) {
		'use strict';

	return function (cursor, state, dsID) {
		function datasetSetting(dataset) {
			var host_name = xenaQuery.parse_host(dataset.dsID),
				host = host_name[0],
				datasetName = host_name[1],
				label = dataset.label ? dataset.label : dataset,
				format = dataset.type,
				status = dataset.status,
				node, div = document.createElement("div");

			node = dom_helper.hrefLink(label,
				"datapages/?dataset=" + encodeURIComponent(datasetName) + "&host=" + encodeURIComponent(host));

			if (status !== GOODSTATUS) {
				node.appendChild(document.createTextNode(" [" + status + "]"));
			}
			node.setAttribute("class", "key");
			div.appendChild(node);

			if ((format === "genomicMatrix") && (status === GOODSTATUS)) {
				var action = genomicMatrixFloat,
					actionArgs;

				node = document.createElement("div");
				actionArgs = [node, host, datasetName];
				session.datasetHasFloats(host, datasetName, action, actionArgs);
				div.appendChild(node);

				//apply button
//				div.appendChild(buildApplyButton(host, datasetName, cohort));
				div.appendChild(buildVizButton());
			}
			return div;
		}


		function genomicMatrixFloat(div, host, datasetName) {
			var node;

			// normalization
			node = buildNormalizationDropDown(host, datasetName);
			div.appendChild(node);

			div.appendChild(document.createElement("br"));

			// color scale
			node = colorScaleChoices(host, datasetName);
			div.appendChild(node);
		}

		// discard user changes & close.
		function buildVizButton() {
			var button = document.createElement("BUTTON");
			button.setAttribute("class", "vizbutton");
			button.appendChild(document.createTextNode("Cancel"));
			button.addEventListener("click", function () {
				cursor.update(_.compose(close, revert));
			});
			return button;
		}

		function inputId(param) {
			return 'custom-' + param;
		}

		function getInputSettings() {
			return _.object(colorParams, _.map(colorParams, function (param) {
				return document.getElementById(inputId(param)).value.replace(/[ \t]/g, '');
			}));
		}

		function getInputSettingsFloat() {
			return _.fmap(getInputSettings(), parseFloat);
		}

		function validateSettings() {
			var s = getInputSettings(),
				vals = _.fmap(s, parseFloat),
				fmtErrors = _.fmap(vals, function (v, k) {
					return (isNaN(v) && s[k]) ? "Invalid number." : "";
				}),
				missing = _.fmap(s, _.constant(null)),
				rangeErrors;

			/*jshint -W018 */ /* allow xor idiom */
			if (!s.minStart !== !s.maxStart) { // xor
				missing.minStart = 'Both 0% values must be given to take effect.';
			}
			// XXX check for missin min & max

			if (s.minStart && s.maxStart && !fmtErrors.minStart && !fmtErrors.maxStart) {
				// wrong if missing maxStart: we compare against the wrong thing.
				rangeErrors = {
					max: null,
					maxStart: vals.maxStart <= vals.max ? null :  'Should be lower than max',
					minStart: vals.minStart <= vals.maxStart ? null : 'Should be lower than maxStart',
					min: vals.min <= vals.minStart ? null : 'Should be lower than minStart'
				};
			} else {
				rangeErrors = {
					max: null,
					min: vals.min <= vals.max ? null : 'Should be lower than max'
				};
			}

			return _.fmap(fmtErrors, function (err, k) {
				return _.filter([err, rangeErrors[k], missing[k]], _.identity).join(' ');
			});
		}

		function settingsValid(errors) {
			return _.every(errors, function (s) { return !s; });
		}

		function displayErrors(errors) {
			_.each(errors, function (err, k) {
				document.getElementById('error-custom-' + k).innerHTML = err;
			});
		}

		function updateSettings(settings) {
			return function(s) {
				return _.update_in(s, ['vizSettings'], function (s) {
					return _.extend({}, s, settings); // overlay new values.
				});
			};
		}

		function colorScaleChoices(host, name) {
			function disableTextInputs(trueORfalse) {
				var id,
					color = trueORfalse ? "gray" : "black";

				colorParams.forEach(function (param) {
					id = inputId(param);
					document.getElementById(id).disabled = trueORfalse;
					document.getElementById(id).style.color = color;
				});
			}

			function buildCustomColorImage(custom) {
				var customColorImage = new Image();
				customColorImage.src = customFloatImg;
				customColorImage.setAttribute("class", "image");
				customColorImage.style.opacity = custom ? "1.0" : "0.6";
				return customColorImage;
			}

			function buildAutoColorImage(auto) {
				var autoColorImage = new Image();
				autoColorImage.src = floatImg;
				autoColorImage.setAttribute("class", "image");
				autoColorImage.style.opacity = auto ? "1.0" : "0.6";
				return autoColorImage;
			}

			function valToStr(v) {
				return v ? "" + v : "";
			}

			function buildCustomColorScale(custom) {
				var node = document.createElement("div"),
					annotations = {
						"max": "high color 100% saturation",
						"maxStart": "high color 0% saturation (black or white)",
						"minStart": "low color 0% saturation (black or white)",
						"min": "low color 100% saturation"
					},
					defaults = {
						max: 1,
						maxStart: null,
						minStart: null,
						min: -1
					},
					settings = _.get_in(oldSettings, ['max']) ? oldSettings : defaults;

				node.setAttribute("class", "block");
				colorParams.forEach(function (param) {
					node.appendChild(buildTextInput(annotations[param], param, inputId(param), custom,
													valToStr(settings[param])));
				});
				node.style.color = custom ? "black" : "gray";
				return node;
			}

			function removeAllVizSettings() {
				colorParams.forEach(function (param) {
					removeVizSettings(param);
				});
			}

			var node = document.createElement("div"),
				text = dom_helper.elt("span", "Color Scale "),
				label, x, custom,
				radioGroup = document.createElement("div"),
				customColorGroup,
				autoColorImage, customColorImage;

			text.setAttribute("class", "text");
			node.appendChild(text);

			radioGroup.setAttribute("class", "radiogroup");
			node.appendChild(radioGroup);

			//check if there is custom value
			custom = colorParams.some(function (param) {
				if (getVizSettings(param)) {
					return true;
				}
			});

			x = document.createElement("INPUT");
			x.setAttribute("type", "radio");
			x.setAttribute("name", "group");
			x.setAttribute("id", "colorauto");
			x.value = "auto";
			x.checked = custom ? false : true;
			x.addEventListener("click", function () {
				removeAllVizSettings();
				customColorGroup.style.color = "gray";
				autoColorImage.style.opacity = "1.0";
				customColorImage.style.opacity = "0.6";
				disableTextInputs(true);
			});
			label = dom_helper.elt("LABEL", " Auto");
			label.setAttribute("for", "colorauto");
			label.setAttribute("class", "text");
			radioGroup.appendChild(x);
			radioGroup.appendChild(label);

			//image
			autoColorImage = buildAutoColorImage(!custom);
			radioGroup.appendChild(autoColorImage);

			radioGroup.appendChild(document.createElement("br"));

			x = document.createElement("INPUT");
			x.setAttribute("type", "radio");
			x.setAttribute("name", "group");
			x.setAttribute("id", "colorcustom");
			x.value = "custom";
			x.checked = custom ? true : false;
			x.addEventListener("click", function () {
				changeTextAction();
				customColorGroup.style.color = "black";
				autoColorImage.style.opacity = "0.6";
				customColorImage.style.opacity = "1.0";
				disableTextInputs(false);
			});
			label = dom_helper.elt("LABEL", " Custom");
			label.setAttribute("for", "colorcustom");
			label.setAttribute("class", "text");
			radioGroup.appendChild(x);
			radioGroup.appendChild(label);

			//image
			customColorImage = buildCustomColorImage(custom);
			radioGroup.appendChild(customColorImage);

			customColorGroup = buildCustomColorScale(custom);
			radioGroup.appendChild(customColorGroup);

			return node;
		}

//		function buildApplyButton(host, name, cohort) {
//			var button = document.createElement("BUTTON"),
//				value;
//
//			button.setAttribute("class", "vizbutton");
//			button.appendChild(document.createTextNode("Done"));
//			button.addEventListener("click", function () {
//				// XXX call validator
//				colorParams.forEach(function (param) {
//					value = document.getElementById(inputId(param)).value;
//					if (isNaN(parseFloat(value))) {
//						removeVizSettings(param);
//					} else {
//						setVizSettings(param, String(parseFloat(value)));
//					}
//				});
//				cursor.update(function (s) {
//					return _.assoc_in(s, ['_vizSettings', 'open'], false);
//				});
//			});
//			return button;
//		}

		function changeTextAction() {
			var err = validateSettings();
			displayErrors(err);

			if (settingsValid(err)) {
				cursor.update(updateSettings(getInputSettingsFloat()));
			}
		}

		function buildTextInput(annotation, label, id, custom, defaultDisplay) {
			var node = document.createElement("div"),
				text,
				input = document.createElement("INPUT"),
				errors = document.createElement("span");

			text = dom_helper.elt("span", annotation);
			text.setAttribute("class", "annotation");
			node.appendChild(text);

			input.setAttribute("type", "text");
			input.setAttribute("class", "textBox");
			input.setAttribute("id", id);
			input.disabled = custom ? false : true;
			input.value = getVizSettings(label) || defaultDisplay;


			input.addEventListener("keydown", function (event) {
				if (event.keyCode === 13) {
					changeTextAction();
				}
			});

			input.addEventListener("blur", function () {
				changeTextAction();
			});

			node.appendChild(input);

			errors.setAttribute("class", "error");
			errors.setAttribute("id", "error-" + id);
			node.appendChild(errors);
			return node;
		}

		function removeVizSettings(key) {
			// xenaState.vizSettings[host + name][key] = undefined;
			cursor.update(function (s) {
				return _.update_in(s, ['vizSettings'], function (s) {
					return _.dissoc(s, key);
				});
			});
		}

		function setVizSettings(key, value) {
			// xenaState.vizSettings[host + name][key] = value;
			cursor.update(function (s) {
				return _.assoc_in(s, ['vizSettings', key], value);
			});
		}

		function getVizSettings(key) {
			return _.get_in(state, ['vizSettings', key]);
		}

		function buildNormalizationDropDown(host, name) {
			var dropDownDiv, option,
				dropDown = [{
						"value": "none",
						"text": "none",
						"index": 0
					}, //no normalization
					{
						"value": "subset",
						"text": "normalize",
						"index": 1
					} //selected sample level

					//{"value": "cohort", "text":"across cohort", "index":1},     //cohort-level
					//{"value": "subset", "text":"across selected samples", "index":2} //selected sample level
				],
				node;

			node = document.createElement("div");
			dropDownDiv = document.createElement("select");
			dropDownDiv.setAttribute("class", "dropDown");

			dropDown.forEach(function (obj) {
				option = document.createElement('option');
				option.value = obj.value;
				option.textContent = obj.text;
				dropDownDiv.appendChild(option);
			});

			var value = getVizSettings('colNormalization');
			if (value) {
				if (value === "none") {
					dropDownDiv.selectedIndex = 0;
				} else if (value === "subset") {
					dropDownDiv.selectedIndex = 1;
				} else {
					dropDownDiv.selectedIndex = 0;
				}
			} else {
				xenaQuery.dataset_text(host, name).subscribe(function (obj) {
					var metaData = JSON.parse(obj[0].text);
					if (metaData.colnormalization || metaData.colNormalization) {
						dropDownDiv.selectedIndex = 1; // get default from metadata in json
					} else {
						dropDownDiv.selectedIndex = 0; // get default from metadata in json
					}
				});
			}

			dropDownDiv.addEventListener('change', function () {
				var key = "colNormalization",
					value = dropDownDiv.options[dropDownDiv.selectedIndex].value;
				setVizSettings(key, value);
			});

			var text = dom_helper.elt("span", "Normalization ");
			text.setAttribute("class", "text");
			node.appendChild(text);
			node.appendChild(dropDownDiv);
			return node;
		}

		function revert(s) {
				return _.assoc(s, 'vizSettings', oldSettings);
		}

		var GOODSTATUS = 'loaded',
			root,
			node,
			oldSettings = _.get_in(state, ['vizSettings']),
			host_name = xenaQuery.parse_host(dsID),
			datasetName = host_name[1],
			host = host_name[0],
			colorParams = ["max", "maxStart", "minStart", "min"];

		root = $('<div>')[0];
		$(root).dialog({
			modal: true,
			width: 800,
			title: 'Advanced Heatmap Settings',
			position: ['center', 'top'],
			close: function () {
					cursor.update(function (s) {
						return _.assoc_in(s, ['_vizSettings', 'open'], false);
					});
				}
		});

		root.className = " settingsRoot";

		//dataset sections
		node = document.createElement("div");
		root.appendChild(node);


		xenaQuery.dataset_by_name(host, datasetName).subscribe(function (datasets) {
			//cohort = datasets[0].cohort;
			//node.appendChild(dom_helper.hrefLink(cohort + " cohort", "datapages/?cohort=" + encodeURIComponent(cohort)));
			node.appendChild(datasetSetting(datasets[0]));

		});

		root.appendChild(document.createElement("br"));

		return function () {
			$(root).dialog('destroy').remove();
		};
	};
});
