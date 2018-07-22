/* eslint-disable */
const SIZE_LIMIT = 1000;

const MESSAGES = {
    FILE_SIZE_EXCEEDED: (size, allowedSize) => `File is too large: ${size} (allowed ${allowedSize})`,
    HEADER_COLUMN_MISMATCH: (lineNo) => `Line ${lineNo} has wrong number of values`,
    COLUMN_IS_REQUIRED: (column) => `Column ${column} is required`,
    SAMPLE_ID_REQUIRED: "First column in dense file format must be sampleid"
}

const getErrorsDense = (lines) => {
    const errors = [];
    errors.push(...columnDataCountMatch(lines));

    return errors;
}

const getErrorsSparse = (lines, dataType) => {
    const errors = [];
    errors.push(...hasSparseDataColumns(lines[0], dataType));

    return errors;
}

//needs to be properly refactored with constants
const getDataTypeTmp = (dataType) =>  dataType === 'mutation by position' || dataType === 'segmented copy number' ? 'sparse' : 'dense';
const dataTypeByFileFormat = {
    'genomicMatrix': 'dense',
    'clinicalMatrix': 'dense',
    'mutationVector': 'sparse',
    'segmented': 'sparse'
};

const functionByDataType = {
    'dense': getErrorsDense,
    'sparse': getErrorsSparse
}

const getSparseColumnRegExps = (dataType) => {
    const res = [
        { regexp: /chr(om)/i, name: 'chrom' },
        { regexp: /start/i, name: 'start' },
        { regexp: /end/i, name: 'end' },
    ];

    if (dataType === 'segmented copy number') {
        res.push(
            // not required { regexp: /strand/i, name: 'strand' },
            { regexp: /value/i, name: 'value' }
        );
    } else if (dataType === 'mutation by position') {
        res.push(
            // not required { regexp: /genes?/i, name: 'genes' },
            { regexp: /alt(ernate)?/i, name: 'alternate' },
            { regexp: /ref(erence)?/i, name: 'reference' },
            // not required { regexp: /effect/i, name: 'effect' },
            // not required { regexp: /dna[-_ ]*v?af/i, name: 'dna_vaf' },
            // not required { regexp: /rna[-_ ]*v?af/i, name: 'rna_vaf' },
            // not required { regexp: /amino[-_ ]*acid[-_ ]*(change)?/i, name: 'amino_acid' }
        );
    }

    return res;
}

const getErrors = (file, contents, dataType) => {
    const errors = [],
        lines = contents.trim().split('\n'),
        type = getDataTypeTmp(dataType),
        errCheckFunc = functionByDataType[type];

    errors.push(hasSampleColumn(getColumns(lines[0])[0]));

    errors.push(...errCheckFunc(lines, dataType));    

    return errors.filter(e => !!e);
}

const checkSizeLimit = (file) => {
    if (file.size >= SIZE_LIMIT) {
        return MESSAGES.FILE_SIZE_EXCEEDED(file.size, SIZE_LIMIT);
    }
}

const hasSparseDataColumns = (header, dataType) => {
    const colRegExps = getSparseColumnRegExps(dataType);
    return colRegExps.map(r => hasColumn(header, r.name, r.regexp));
}

const hasColumn = (header, columnName, regexp) => {
    if(!header.match(regexp)) {
        return MESSAGES.COLUMN_IS_REQUIRED(columnName);
    }
}

const hasSampleColumn = header => {
    const err = hasColumn(header.split(/\t/g)[0], "sampleid", /sample[ _]*(name|id)?/gi);
    if (err) {
        return MESSAGES.SAMPLE_ID_REQUIRED;
    }
};

const getColumns = line => line.split(/\t/g);
const getColumnsCount = cols => cols.length;

const columnDataCountMatch = (lines) => {
    const headerLen = getColumns(lines[0]).length;
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (getColumnsCount(getColumns(lines[i])) !== headerLen) {
            result.push(MESSAGES.HEADER_COLUMN_MISMATCH(i+1));
        }
    }

    return result;
}

//for dense data
const checkUniqueSampleIDs = () => {

}

export default getErrors;