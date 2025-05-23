
import { pluck } from './underscore_ext.js';
import {parse as parser} from './models/geneSignatureParser';
// Parse a simple list of genes and weights. More complex signatures would
// be possible, but will require some work writing the xena query.
//

function parse(str) {
	if (str[0] !== '=') {
		return;
	}
	try {
		var list = parser(str.slice(1).trim());
		return {
			weights: pluck(list, 0),
			genes: pluck(list, 1)
		};
	} catch (e) {
		console.log('parsing error', e);
	}
	return;
}

export default parse;
