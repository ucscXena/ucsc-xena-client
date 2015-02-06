define(["xenaQuery", "dom_helper", "session", "config"],
	function (xenaQuery, dom_helper, session, config) {
		'use strict';

		var root, vizbutton,
			div, node, listNode,
			xenaState,
			query_string = dom_helper.queryStringToJSON(),
			datasetName, host, cohort,
			colorParams = ["max", "maxStart", "minStart", "min"];

		root = document.createElement("div");
		root.setAttribute("id", "settingsRoot");
		document.body.appendChild(root);

		xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;

		if (query_string.dataset) {
			datasetName = decodeURIComponent(query_string.dataset);
		}
		if (query_string.host) {
			host = decodeURIComponent(query_string.host);
		}

		//header
		root.appendChild(dom_helper.elt("h2", "Advanced Heatmap Settings"));

		if (!host || !datasetName) {
			return;
		}

		//dataset sections
		node = document.createElement("div");
		root.appendChild(node);

		xenaQuery.dataset_by_name(host, datasetName).subscribe(function (datasets) {
			cohort = datasets[0].cohort;
			node.appendChild(dom_helper.hrefLink(cohort + " cohort", "../datapages/?cohort=" + encodeURIComponent(cohort)));
			if (cohort === xenaState.cohort) {
				node.appendChild(buildVizButton());
			}

			node.appendChild(datasetSetting(datasets[0]));

		});

		root.appendChild(document.createElement("br"));

		function datasetSetting(dataset) {
			var host = JSON.parse(dataset.dsID).host,
				datasetName = JSON.parse(dataset.dsID).name,
				label = dataset.label ? dataset.label : dataset,
				format = dataset.type,
				status = dataset.status,
				cohort = dataset.cohort,
				node, div = document.createElement("div");

			node = dom_helper.hrefLink(label,
				"../datapages/?dataset=" + encodeURIComponent(datasetName) + "&host=" + encodeURIComponent(host));

			if (status !== session.GOODSTATUS) {
				node.appendChild(document.createTextNode(" [" + status + "]"));
			}
			node.setAttribute("class", "key");
			div.appendChild(node);

			if ((format === "genomicMatrix") && (status === session.GOODSTATUS)) {
				var action = genomicMatrixFloat,
					actionArgs;

				node = document.createElement("div");
				actionArgs = [node, host, datasetName];
				session.datasetHasFloats(host, datasetName, action, actionArgs);
				div.appendChild(node);

				//apply button
				div.appendChild(buildApplyButton(host, datasetName, cohort));
			}
			return div;
		}


		function genomicMatrixFloat(div, host, datasetName) {
			var node, normalization;

			// normalization
			node = buildNormalizationDropDown(host, datasetName);
			div.appendChild(node);

			div.appendChild(document.createElement("br"));

			// color scale
			node = colorScaleChoices(host, datasetName);
			div.appendChild(node);
		}

		function buildVizButton() {
			var button = document.createElement("BUTTON");
			button.setAttribute("class", "vizbutton");
			button.appendChild(document.createTextNode("Cohort Heatmap"));
			button.addEventListener("click", function () {
				location.href = "../"; //goto heatmap page
			});
			return button;
		}

		function colorScaleChoices(host, name) {
			var node = document.createElement("div"),
				text = dom_helper.elt("span", "Color Scale "),
				label, x, value, id, custom,
				radioGroup = document.createElement("div"),
				customColorGroup,
				autoColorImage, customColorImage;

			text.setAttribute("class", "text");
			node.appendChild(text);

			radioGroup.setAttribute("class", "radiogroup");
			node.appendChild(radioGroup);

			//check if there is custom value
			custom = colorParams.some(function (param) {
				if (getXenaVizSettings(host, datasetName, param)) {
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

			function disableTextInputs(trueORfalse) {
				var id,
					color = trueORfalse ? "gray" : "black";

				colorParams.forEach(function (param) {
					id = host + name + param;
					document.getElementById(id).disabled = trueORfalse;
					document.getElementById(id).style.color = color;
				});
			}

			function buildCustomColorImage(custom) {
				var customColorImage = document.createElement("IMG");
				customColorImage.setAttribute("src", "https://users.soe.ucsc.edu/~jzhu/genomicCustomFloatLegend.jpg");
				customColorImage.setAttribute("class", "image");
				customColorImage.style.opacity = custom ? "1.0" : "0.6";
				return customColorImage;
			}

			function buildAutoColorImage(auto) {
				var autoColorImage = document.createElement("IMG");
				autoColorImage.setAttribute("src", "https://users.soe.ucsc.edu/~jzhu/genomicFloatLegend.jpg");
				autoColorImage.setAttribute("class", "image");
				autoColorImage.style.opacity = auto ? "1.0" : "0.6";
				return autoColorImage;
			}

			function buildCustomColorScale(custom) {
				var node = document.createElement("div"),
					id,
					annotatoins = {
						"max": "high color 100% saturation",
						"maxStart": "high color 0% saturation (black or white)",
						"minStart": "low color 0% saturation (black or white)",
						"min": "low color 100% saturation"
					};

				node.setAttribute("class", "block");
				colorParams.forEach(function (param) {
					id = host + name + param;
					node.appendChild(buildTextInput(annotatoins[param], param, id, host, name, custom));
				});
				node.style.color = custom ? "black" : "gray";
				return node;
			}

			function removeAllVizSettings() {
				colorParams.forEach(function (param) {
					removeVizSettings(host, name, param);
				});
			}

		}

		function buildApplyButton(host, name, cohort) {
			var button = document.createElement("BUTTON"),
				id, value;

			button.setAttribute("class", "vizbutton");
			button.appendChild(document.createTextNode("Apply"));
			button.addEventListener("click", function () {
				colorParams.forEach(function (param) {
					id = host + name + param;
					value = document.getElementById(id).value;
					if (isNaN(parseFloat(value))) {
						removeCustomVizSettings(host, name, param);
					} else {
						setCustomVizSettings(host, name, param, String(parseFloat(value)));
					}
					if (document.getElementById("colorcustom").checked) {
						if (isNaN(parseFloat(value))) {
							removeVizSettings(host, name, param);
						} else {
							setXenaVizSettings(host, name, param, String(parseFloat(value)));
						}
					} else {
						removeVizSettings(host, name, param);
					}
				});
				if (cohort === xenaState.cohort) {
					location.href = "../";
				}
			});
			return button;
		}

		function buildTextInput(annotation, label, id, host, name, custom) {
			var xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
				node = document.createElement("div"),
				text,
				input = document.createElement("INPUT"),
				defaultDisplay = "";

			text = dom_helper.elt("span", annotation);
			text.setAttribute("class", "annotation");
			node.appendChild(text);

			input.setAttribute("type", "text");
			input.setAttribute("class", "textBox");
			input.setAttribute("id", id);
			input.disabled = custom ? false : true;
			input.value = getXenaVizSettings(host, name, label) ||
				getCustomVizSettings(host, name, label) || defaultDisplay;


			input.addEventListener("keydown", function (event) {
				if (event.keyCode === 13) {
					changeTextAction();
				}
			});

			input.addEventListener("blur", function () {
				changeTextAction();
			});

			node.appendChild(input);
			return node;

			function changeTextAction() {
				var key = label,
					value = input.value;

				if (isNaN(parseFloat(value))) {
					input.value = defaultDisplay;
					removeVizSettings(host, name, key);
					removeCustomVizSettings(host, name, key);
				} else {
					input.value = String(parseFloat(value));
					setXenaVizSettings(host, name, key, input.value);
					setCustomVizSettings(host, name, key, input.value);
				}
			}
		}

		function removeVizSettings(host, name, key) {
			var xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;

			if (xenaState.vizSettings && xenaState.vizSettings[host + name]) {
				xenaState.vizSettings[host + name][key] = undefined;
			}
			sessionStorage.xena = JSON.stringify(xenaState);
		}

		function removeCustomVizSettings(host, name, key) {
			var state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;

			if (state.vizSettings && state.vizSettings[host + name]) {
				state.vizSettings[host + name][key] = undefined;
			}
			sessionStorage.xena = JSON.stringify(state);
		}

		function setXenaVizSettings(host, name, key, value) {
			var xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;

			if (!xenaState.vizSettings) {
				xenaState.vizSettings = {};
			}
			if (!xenaState.vizSettings[host + name]) {
				xenaState.vizSettings[host + name] = {};
			}
			xenaState.vizSettings[host + name][key] = value;
			sessionStorage.xena = JSON.stringify(xenaState);
		}

		function setCustomVizSettings(host, name, key, value) {
			var state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;

			if (!state.vizSettings) {
				state.vizSettings = {};
			}
			if (!state.vizSettings[host + name]) {
				state.vizSettings[host + name] = {};
			}
			state.vizSettings[host + name][key] = value;
			sessionStorage.xena = JSON.stringify(state);
		}

		function getXenaVizSettings(host, name, key) {
			var xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;
			if (xenaState.vizSettings && xenaState.vizSettings[host + name]) {
				return xenaState.vizSettings[host + name][key];
			}
		}

		function getCustomVizSettings(host, name, key) {
			var state = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined;
			if (state.vizSettings && state.vizSettings[host + name]) {
				return state.vizSettings[host + name][key];
			}
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
				xenaState = sessionStorage.xena ? JSON.parse(sessionStorage.xena) : undefined,
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

			if (xenaState.vizSettings && xenaState.vizSettings[host + name] &&
				xenaState.vizSettings[host + name].colNormalization) {
				var value = xenaState.vizSettings[host + name].colNormalization;
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
				setXenaVizSettings(host, name, key, value);
			});

			var text = dom_helper.elt("span", "Normalization ");
			text.setAttribute("class", "text");
			node.appendChild(text);
			node.appendChild(dropDownDiv);
			return node;
		}

	});
