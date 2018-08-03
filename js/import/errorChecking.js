'use strict';

import _ from '../underscore_ext';

const HEADER_LENGTH_LIMIT = 255,
    MULTI_ERROR_LIMIT = 3;

let ERRORS;

const getColumns = line => line.split(/\t/g);
const getFirstLine = lines => lines[0];
const getFirstColumn = lines => lines.map(l => l[0]);

// is files first row - sampleids ? (columns then represent record)
const isColumns = fileFormat => fileFormat === 'genomicMatrix';

const getHeaderNames = (lines, fileFormat) => isColumns(fileFormat) ? getFirstColumn(lines) : getFirstLine(lines);
const getSampleIds = (lines, fileFormat) => {
    const sampleLine = isColumns(fileFormat) ? getFirstLine(lines) : getFirstColumn(lines);
    // first member is header name
    return sampleLine.slice(1);
};

const transposeLines = lines => _.zip(...lines);

const filterEmpty = arr => arr.filter(elem => !!elem);

const getErrorClass = (dataType) => dataType === 'mutation by position' || dataType === 'segmented copy number' ? dataType : 'dense';

const getMutationHeaderRegExps = () => {
    return [
        { regexp: /sample[ _]*(name|id)?/i, name: "'sampleid'"},
        { regexp: /chr(om)/i, name: "'chrom'" },
        { regexp: /start/i, name: "'start'" },
        { regexp: /end/i, name: "'end'" },
        { regexp: /alt(ernate)?/i, name: "'alternate'" },
        { regexp: /ref(erence)?/i, name: "'reference'" }
    ];
};

const getSegmentedHeaderRegExps = () => {
    return [
        { regexp: /sample[ _]*(name|id)?/i, name: "'sampleid'"},
        { regexp: /chr(om)/i, name: "'chrom'" },
        { regexp: /start/i, name: "'start'" },
        { regexp: /end/i, name: "'end'" },
        { regexp: /value/i, name: "'value'" }
    ];
};

const getErrors = (fileContent, fileFormat, dataType) => {
    const errorClass = getErrorClass(dataType);
    let filteredErrors = [],
        lines,
        result = [];

    filteredErrors = ERRORS.filter(err => err.forType.some(type => type === errorClass));

    //get lines
    lines = fileContent.trim().split('\n');
    lines = lines.map(l => getColumns(l));

    //iterate through rules and return array
    filteredErrors.forEach(error => {
        const messages = error.getErrors(lines, fileFormat);
        if (messages) {
            if (Array.isArray(messages)) {
                result.push(...messages);
            } else {
                result.push(messages);
            }
        }
    });

    return result;
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
        forType: ['dense', 'mutation by position', 'segmented copy number'],
        getErrors: (lines, fileFormat) => {
            const message = (header) => `${header.slice(0, 100)}... is too long. Please limit to 255 characters`;

            const headerNames = getHeaderNames(lines, fileFormat),
                result = [];

            headerNames.forEach(name => {
                if (name.length > HEADER_LENGTH_LIMIT && result.length < MULTI_ERROR_LIMIT) {
                    result.push(message(name));
                }
            });

            return result.length ? result : null;
        }
    },
    {
        //HEADER CHARACTERS
        level: 'error',
        forType: ['dense', 'mutation by position', 'segmented copy number'],
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
        }
    },
    {
        //HEADER COLUMN COUNT MISMATCH
        level: 'error',
        forType: ['dense'],
        getErrors: (lines, fileFormat) => {
            const message = (line, trns) =>
                `The number of headers doesn't match the number of columns on ${trns ? 'column' : 'line'} ${line}. Please edit the file and reload`;

            const headerLen = filterEmpty(getHeaderNames(lines, fileFormat)).length,
                result = [],
                isTransposed = isColumns(fileFormat);

            lines = isTransposed ? transposeLines(lines) : lines;

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].length !== headerLen && result.length < MULTI_ERROR_LIMIT) {
                    result.push(message(i, isTransposed));
                }
            }
            return result;
        }
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
        }
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
        }
    },
    {
        //SEGMENTED REQUIRED HEADERS
        level: 'error',
        forType: ['segmented copy number'],
        getErrors: (lines) => {
            const message = (missing) =>
                `For segmented copy number data we require 5 columns: 'sample', 'chr', 'start', 'end', and 'value'. You are missing ${missing.join(', ')}. Please edit your file and reload.`;

            const headerNames = getHeaderNames(lines);
            return message(hasSparseDataColumns(headerNames, getSegmentedHeaderRegExps()));
        }
    },
    {
        //MUTATION REQUIRED HEADERS
        level: 'error',
        forType: ['mutation by position'],
        getErrors: (lines) => {
            const message = (missing) =>
                `For mutation data we require 6 columns: 'sample', 'chr', 'start', 'end', 'ref' and 'alt'. You are missing ${missing.join(', ')}. Please edit your file and reload.`;

            const headerNames = getHeaderNames(lines);
            return message(hasSparseDataColumns(headerNames, getMutationHeaderRegExps()));
        }
    }
];

export default getErrors;
