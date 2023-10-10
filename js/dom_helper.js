/*eslint camelcase: 0 */

var _ = require('./underscore_ext').default;

//create a ELEMENT_NODE with a tag, and all following argument as a child to this node
function elt(tag) {
	var node = document.createElement(tag);

	_.each(_.map(_.rest(arguments), function (child) {
		return (typeof child === 'string') ? document.createTextNode(child) : child;
	}), _.bind(node.appendChild, node));
	return node;
}

// create a href ELEMENT_NODE
function hrefLink(text, link) {
	var node = elt("a", text);
	node.setAttribute("href", link);
	return node;
}

// create an ELEMENT_NODE with id=<valueId>
function valueNode(valueId) {
	var node = elt("result", "");
	node.setAttribute("id", valueId);
	return node;
}

// create an ELEMENT_NODE with label:<valueId> where valueId a DOM placement holder with id=<valueId>, for filling in the values later
//  use function like
//          node = document.getElementById(valueId);
//          node.appendChild(document.createTextNode(VALUE));
function labelValueNode(label, valueId) {
	var node = elt("label", label);
	node.appendChild(valueNode(valueId));
	return node;
}

//create an ELEMENT_NODE with tag=<section> and id=label
function sectionNode(label) {
	var node = elt("section");
	node.setAttribute("id", label);
	return node;
}

function stripHTML(html) {
	return html ? html.replace(/(<([^>]+)>)/ig, "") : '';
}

function stripScripts(html) {
	var div = document.createElement('div'),
		scripts = div.getElementsByTagName('script'),
		i = scripts.length;
	div.innerHTML = html;
	while (i--) {
		scripts[i].parentNode.removeChild(scripts[i]);
	}
	return div.innerHTML;
}

//parse url queryString to json
function queryStringToJSON() {
	var pairs = location.search.slice(1).split('&'),
		result = {};
	pairs.forEach(function (pair) {
		pair = pair.split('=');
		if (pair[0] && pair[1]) {
			result[pair[0]] = decodeURIComponent(pair[1] || '');
		}
	});

	return result;
}

function JSONToqueryString(obj) {
var qString = Object.keys(obj).map(function(k) {
		return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
	}).join('&');
	return qString;
}


function tableCreate(row, column) {
  var tbl  = document.createElement('table'), tr, td, i, j;
  tbl.setAttribute("class", "dataSnippetTable");
  for(i = 0; i < row; i++) {
  tr = tbl.insertRow(i);
  for(j = 0; j < column; j++) {
	td = tr.insertCell(j);
	td.innerHTML = "...";
  }
  }
  return tbl;
}

function setTableCellValue (tbl, row, column, value) {
	tbl.rows[row].cells[column].innerHTML = value;
}

function stringToDOM(str) {
	var d = document.createElement('div');
	d.innerHTML = str;
	return d.childNodes;
}

function append(el, list) {
	while (list.length) {
		el.appendChild(list[0]);
	}
}

function loadingCircle() {
	var div = sectionNode("cohort"),
		node = document.createElement("div"),
		i;

	div.appendChild(node);
	node.setAttribute("class", "spinner circles");
	for (i = 0; i < 8; i++) {
	node.appendChild(document.createElement("div"));
	}
	return div;
}

module.exports = {
	elt,
	hrefLink,
	labelValueNode,
	valueNode,
	sectionNode,
	stripHTML,
	stripScripts,
	tableCreate,
	setTableCellValue,
	queryStringToJSON,
	JSONToqueryString,
	stringToDOM,
	append,
	loadingCircle
};
