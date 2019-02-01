'use strict';

import _ from '../underscore_ext';
import {DATA_TYPE} from './constants';

const {MUTATION_BY_POS, SEGMENTED_CN, GENOMIC} = DATA_TYPE;

const HEADER_LENGTH_LIMIT = 255,
    MULTI_ERROR_LIMIT = 3;

let ERRORS, HEADER_ERRORS;

const getColumns = line => line.replace(/[\r\n]+$/, '').split(/\t/g);

const filterEmpty = arr => arr.filter(elem => !!elem);

const getErrDataType = (dataType) => dataType === MUTATION_BY_POS || dataType === SEGMENTED_CN ? dataType : 'dense';

const getMutationHeaderRegExps = [
	{ regexp: /sample[ _]*(name|id)?/i, name: "'sample'"},
	{ regexp: /chr(om)?/i, name: "'chrom'" },
	{ regexp: /start/i, name: "'start'" },
	{ regexp: /end/i, name: "'end'" },
	{ regexp: /alt(ernate)?/i, name: "'alternate'" },
	{ regexp: /ref(erence)?/i, name: "'reference'" }
];

const getSegmentedHeaderRegExps = [
	{ regexp: /sample[ _]*(name|id)?/i, name: "'sample'"},
	{ regexp: /chr(om)?/i, name: "'chrom'" },
	{ regexp: /start/i, name: "'start'" },
	{ regexp: /end/i, name: "'end'" },
	{ regexp: /value/i, name: "'value'" }
];

const gatherErrorMessages = (state, dataType, errors, line, i) => {
    errors.forEach(error => {
        error.getErrors(state, dataType, line, i);
	});
};

// Return function that error checks a line, keeping results (imperatively)
// in 'state'.
const getErrors = (dataType, state) => {
    var filterByDataType = getErrDataType(dataType),
		dataTypeErrors = ERRORS.filter(err => err.forType.some(dType => dType === filterByDataType)),
		dataTypeHeaderErrors = HEADER_ERRORS.filter(err => err.forType.some(dType => dType === filterByDataType)),
		i = 0;
	state.errors = [];
	state.warnings = [];
	state.snippets = [];

	return line => {
		//iterate through rules and populate state
		var lineCols = getColumns(line); // should this trim()? Or trim() earlier?
		if (i === 0) {
			state.rows = new Set();
			state.headerLen = lineCols.length;
			gatherErrorMessages(state, dataType, dataTypeHeaderErrors, lineCols);
		} else {
			gatherErrorMessages(state, dataType, dataTypeErrors, lineCols, i);
		}

		i += 1;
	};
};

const hasColumn = (header, columnName, regexp) => {
    if (!header.some(h => h.match(regexp))) {
        return columnName;
    }
};

const hasSparseDataColumns = (header, colRegExps) =>
    filterEmpty(colRegExps.map(r => hasColumn(header, r.name, r.regexp)));

ERRORS = [
    {
        //HEADER COLUMN COUNT MISMATCH
        forType: [MUTATION_BY_POS, SEGMENTED_CN, 'dense'], // XXX for all types?
        getErrors: (state, dataType, line, i) => {
			var c = state.columnMismatch || 0;
			if (line.length !== state.headerLen && c < MULTI_ERROR_LIMIT) {
				state.errors.push(`The number of headers doesn't match the number of columns on line ${i + 1}. Please edit the file and reload`);
				state.columnMismatch = c + 1;
			}
        }
    },
    {
        //DUPLICATE ROW KEY
        forType: ['dense'],
        getErrors: (state, dataType, line/*, i*/) => {
			if (!state.duplicateRows && state.rows.has(line[0])) {
				if (dataType === GENOMIC) {
					state.warnings.push(`There are duplicate probe names in your file. An example is ${line[0]}. We will load the first one and rename the duplicates.`);
				} else {
					state.warnings.push(`There are duplicate sample names in your file. An example is ${line[0]}. We will load the first one and ignore all others.`);
				}
				state.duplicateRows = true;
			} else {
				state.rows.add(_.copyStr(line[0]));
			}
        }
    }
];

HEADER_ERRORS = [
    {
        //HEADER LENGTHS
        forType: ['dense', MUTATION_BY_POS, SEGMENTED_CN],
        getErrors: (state, dataType, line) => {
            const message = (header) => `${header.slice(0, 100)}... is too long. Please limit to 255 characters`;

            var c = 0;
            for(let i = 0; i < line.length; i++) {
                const name = line[i];

                if (name.length > HEADER_LENGTH_LIMIT) {
                    state.errors.push(message(name));
                    c += 1;

                    if (c >= MULTI_ERROR_LIMIT) {
                        break;
                    }
                }
            }
        }
    },
    { // XXX discard, or maybe check for quotes?
        //HEADER CHARACTERS
        forType: ['dense', MUTATION_BY_POS, SEGMENTED_CN],
        getErrors: (/*state, line*/) => {
            // const message = (header) => `Headers can only have xyz. Please change ${header}`;
        }
    },
    {
        //HEADER EMPTY
        forType: ['dense', MUTATION_BY_POS, SEGMENTED_CN],
        getErrors: (state, dataType, line) => {
            if (line.some(h => h.trim() === '')) {
				state.errors.push('One or more of your headers is blank. Please edit the file and reload.');
            }
        }
    },
    {
        //DUPLICATE HEADER KEYS
        forType: ['dense'],
        getErrors: (state, dataType, line) => {
			var headers = new Set(),
				dup = _.find(line, s => {
					if (headers.has(s)) {
						return true;
					}
					headers.add(s); // XXX note side-effecting predicate
				});
			if (dup) {
				if (dataType === GENOMIC) {
					state.warnings.push(`There are duplicate samples in your file. An example is ${dup}. We will load the first one and ignore all others.`);
				} else {
					state.warnings.push(`There are duplicate phenotypes in your file. An example is ${dup}. We will load the first one and rename the duplicates.`);
				}
			}
        }
    },
    {
        //SEGMENTED REQUIRED HEADERS
        forType: [SEGMENTED_CN],
        getErrors: (state, dataType, line) => {
            const missing = hasSparseDataColumns(line, getSegmentedHeaderRegExps);
			if (missing.length) {
				state.errors.push(`For segmented copy number data we require 5 columns: 'sample', 'chrom', 'start', 'end', and 'value'. You are missing ${missing.join(', ')}. Please edit your file and reload.`);
				state.snippets.push({
					exampleLines: [
						['sample', 'chrom', 'start', 'end', 'value'],
						['TCGA-OR-A5LT-01', 'chr1', '61735', '98588', '0.1842']]
				});

			}
        }
    },
    {
        //MUTATION REQUIRED HEADERS
        forType: [MUTATION_BY_POS],
        getErrors: (state, dataType, line) => {
            const missing = hasSparseDataColumns(line, getMutationHeaderRegExps);
			if (missing.length) {
				state.errors.push(`For mutation data we require 6 columns: 'sample', 'chrom', 'start', 'end', 'reference' and 'alternate'. You are missing ${missing.join(', ')}. Please edit your file and reload.`);
				state.snippets.push({
					exampleLines: [
						['sample', 'chrom', 'start', 'end', 'reference', 'alternate'],
						['TCGA-PK-A5HB-01', 'chr1', '877831', '877831', 'T', 'C']]
				});
			}
        }
    }
];

export default getErrors;
