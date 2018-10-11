'use strict';

import _ from '../underscore_ext';
import { FILE_FORMAT, DATA_TYPE } from './constants';

const HEADER_LENGTH_LIMIT = 255,
    MULTI_ERROR_LIMIT = 3;

let ERRORS;

const getColumns = line => line.split(/\t/g);
const getFirstLine = lines => lines[0];
const getFirstColumn = lines => lines.map(l => l[0]);

// is files first row - sampleids ? (columns then represent record)
const isColumns = fileFormat => fileFormat === FILE_FORMAT.GENOMIC_MATRIX;

const getHeaderNames = (lines, fileFormat) => isColumns(fileFormat) ? getFirstColumn(lines) : getFirstLine(lines);
const getSampleIds = (lines, fileFormat) => {
    const sampleLine = isColumns(fileFormat) ? getFirstLine(lines) : getFirstColumn(lines);
    // first member is header name
    return sampleLine.slice(1);
};

const filterEmpty = arr => arr.filter(elem => !!elem);

const getErrDataType = (dataType) => dataType === DATA_TYPE.MUTATION_BY_POS || dataType === DATA_TYPE.SEGMENTED_CN ? dataType : 'dense';

const getMutationHeaderRegExps = () => {
    return [
        { regexp: /sample[ _]*(name|id)?/i, name: "'sample'"},
        { regexp: /chr(om)?/i, name: "'chrom'" },
        { regexp: /start/i, name: "'start'" },
        { regexp: /end/i, name: "'end'" },
        { regexp: /alt(ernate)?/i, name: "'alternate'" },
        { regexp: /ref(erence)?/i, name: "'reference'" }
    ];
};

const getSegmentedHeaderRegExps = () => {
    return [
        { regexp: /sample[ _]*(name|id)?/i, name: "'sample'"},
        { regexp: /chr(om)?/i, name: "'chrom'" },
        { regexp: /start/i, name: "'start'" },
        { regexp: /end/i, name: "'end'" },
        { regexp: /value/i, name: "'value'" }
    ];
};

const gatherErrorMessages = (errors, lines, fileFormat) => {
    const errMessages = [],
        snippets = [];

    errors.forEach(error => {
        const messages = error.getErrors(lines, fileFormat);
        if (messages) {

            snippets.push(error.getSnippets(lines)); // could be refactored a bit for readability. Maybe by making errors stateful

            if (Array.isArray(messages)) {
                errMessages.push(...messages);
            } else {
                errMessages.push(messages);
            }
        }
    });
    return [ errMessages, snippets ];
};

const getErrors = (fileContent, fileFormat, dataType) => {
    const filterByDataType = getErrDataType(dataType);

    let filteredErrors = ERRORS.filter(err => err.forType.some(dType => dType === filterByDataType)),
        filteredWarnings = filteredErrors.filter(err => err.level === 'warning');

    filteredErrors = filteredErrors.filter(err => err.level === 'error');

    //get lines
    let lines = fileContent.replace(/[\n\r]*$/, '')
        .split(/\r\n|\r|\n/g)
        .map(l => getColumns(l));

    //iterate through rules and return array
    const [errors, errorSnippets] = gatherErrorMessages(filteredErrors, lines, fileFormat);
    const [warnings, warningSnippets] = gatherErrorMessages(filteredWarnings, lines, fileFormat);
    const snippets = filterEmpty([...errorSnippets, ...warningSnippets]);

    return { errors, warnings, snippets };
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
        //HEADER LENGTHS
        level: 'error',
        forType: ['dense', DATA_TYPE.MUTATION_BY_POS, DATA_TYPE.SEGMENTED_CN],
        getErrors: (lines, fileFormat) => {
            const message = (header) => `${header.slice(0, 100)}... is too long. Please limit to 255 characters`;

            const headerNames = getHeaderNames(lines, fileFormat),
                result = [];

            for(let i = 0; i < headerNames.length; i++) {
                const name = headerNames[i] || '';

                if (name.length > HEADER_LENGTH_LIMIT) {
                    result.push(message(name));

                    if(result.length >= MULTI_ERROR_LIMIT) {
                        break;
                    }
                }
            }

            return result.length ? result : null;
        },
        getSnippets: () => {}
    },
    {
        //HEADER CHARACTERS
        level: 'error',
        forType: ['dense', DATA_TYPE.MUTATION_BY_POS, DATA_TYPE.SEGMENTED_CN],
        getErrors: () => {
            // const message = (header) => `Headers can only have xyz. Please change ${header}`;
        }
    },
    {
        //HEADER EMPTY
        level: 'error',
        forType: ['dense'],
        getErrors: (lines, fileFormat) => {
            const message = 'One or more of your headers is blank. Please edit the file and reload.';
            const headerNames = getHeaderNames(lines, fileFormat);

            if (headerNames.filter(h => h.trim() === '').length !== 0) {
                return message;
            }
        },
        getSnippets: () => {}
    },
    {
        //HEADER COLUMN COUNT MISMATCH
        level: 'error',
        forType: ['dense'],
        getErrors: (lines, fileFormat) => {
            const message = (line) =>
                `The number of headers doesn't match the number of columns on line ${line}. Please edit the file and reload`;

            const headerLen = lines[0].length,
                result = [],
                isTransposed = isColumns(fileFormat);

            let i = isTransposed ? 0 : 1;

            for (i; i < lines.length; i++) {
                if (lines[i].length !== headerLen) {
                    result.push(message(i + 1));

                    if(result.length >= MULTI_ERROR_LIMIT) {
                        break;
                    }
                }
            }
            return result;
        },
        getSnippets: () => {}
    },
    {
        //DUPLICATE PROBE HEADERS
        level: 'warning',
        forType: ['dense'],
        getErrors: (lines, fileFormat) => {
            const message = (name) =>
                `There are duplicate names in your file. An example is ${name}. We will load the first one and ignore all others.`;
            const headerNames = filterEmpty(getHeaderNames(lines, fileFormat)),
                duplicates = _.duplicates(headerNames);

            if (duplicates.length !== 0) {
                return message(duplicates[0]);
            }
        },
        getSnippets: () => {}
    },
    {
        //DUPLICATE SAMPLE IDS
        level: 'warning',
        forType: ['dense'],
        getErrors: (lines, fileFormat) => {
            const message = (sampleName) =>
                `There are duplicate samples in your file. An example is ${sampleName}. We will load the first one and ignore all others.`;

            const sampleIds = getSampleIds(lines, fileFormat),
                duplicates = _.duplicates(sampleIds);

            if (duplicates.length !== 0) {
                return message(duplicates[0]);
            }
        },
        getSnippets: () => {}
    },
    {
        //SEGMENTED REQUIRED HEADERS
        level: 'error',
        forType: [DATA_TYPE.SEGMENTED_CN],
        getErrors: (lines) => {
            const message = (missing) =>
                `For segmented copy number data we require 5 columns: 'sample', 'chrom', 'start', 'end', and 'value'. You are missing ${missing.join(', ')}. Please edit your file and reload.`;

            const headerNames = getHeaderNames(lines);
            const missingNames = hasSparseDataColumns(headerNames, getSegmentedHeaderRegExps());
            return missingNames.length ? message(missingNames) : null;
        },
        getSnippets: (lines) => {
            const exampleLines = [
                ['sample', 'chrom', 'start', 'end', 'value'],
                ['TCGA-OR-A5LT-01', 'chr1', '61735', '98588', '0.1842']
            ];

            const errorLines = lines.slice(0, 2);
            return { exampleLines, errorLines };
        }
    },
    {
        //MUTATION REQUIRED HEADERS
        level: 'error',
        forType: [DATA_TYPE.MUTATION_BY_POS],
        getErrors: (lines) => {
            const message = (missing) =>
                `For mutation data we require 6 columns: 'sample', 'chrom', 'start', 'end', 'reference' and 'alternate'. You are missing ${missing.join(', ')}. Please edit your file and reload.`;

            const headerNames = getHeaderNames(lines);
            const missingNames = hasSparseDataColumns(headerNames, getMutationHeaderRegExps());
            return missingNames.length ? message(missingNames) : null;
        },
        getSnippets: (lines) => {
            const exampleLines = [
                ['sample', 'chrom', 'start', 'end', 'reference', 'alternate'],
                ['TCGA-PK-A5HB-01', 'chr1', '877831', '877831', 'T', 'C']
            ];

            const errorLines = lines.slice(0, 2);
            return { exampleLines, errorLines };
        }
    }
];

export default getErrors;
