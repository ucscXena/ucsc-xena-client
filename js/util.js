
import {apply, constant, first, flatmap, groupBy, isArray, map, mapObject,
	times, zip} from './underscore_ext.js';

function expandArrays(v, k) {
	if (isArray(v)) {
		return zip(v, times(v.length, constant(k)));
	}
	return [[v, k]];
}

var encodeParam = (v, k) => k + "=" + encodeURIComponent(v);

var encodeObject = obj => map(flatmap(obj, expandArrays), apply(encodeParam)).join("&");

var searchParams = search =>
	search.length > 1 ?
		mapObject(
			groupBy(
				search.slice(1).split('&')
					.map(exp => exp.split('=').map(decodeURIComponent)),
				first),
			arr => arr.map(([, val]) => val)) :
		{};

const getParameterByName = function (name) {
    // TODO duplicates galaxy.js, so extract into common file
    // see http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values/901144#901144
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};

const urlParams = url => {
    var i = url.indexOf('?');
    return i === -1 ? {} : searchParams(url.slice(i));
};

const allParameters = () => searchParams(location.search);

const eventOffset = function (ev) {
    var {top, left} = ev.currentTarget.getBoundingClientRect();
    return {
        x: ev.pageX - (left + window.pageXOffset),
        y: ev.pageY - (top + window.pageYOffset)
    };
};

const addCommas = function (nStr) {
    nStr += '';
    var x = nStr.split('.'),
        x1 = x[0],
        x2 = x.length > 1 ? '.' + x[1] : '',
        rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
};

const hasClass = function(el, c) {
    return el.className.split(/ +/).indexOf(c) !== -1;
};

const caseInsensitiveSort = function (a, b) {
    if (a.toUpperCase() < b.toUpperCase()) {
            return -1;
    } else if (a.toUpperCase() > b.toUpperCase()) {
            return 1;
    } else {
            return 0;
    }
};

export { encodeObject, getParameterByName, urlParams, allParameters, eventOffset, addCommas, hasClass, caseInsensitiveSort };
