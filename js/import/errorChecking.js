/* eslint-disable */
const SIZE_LIMIT = 1000;

const MESSAGES = {
    FILE_SIZE_EXCEEDED: (size, allowedSize) => `File is too large: ${size} (allowed ${allowedSize})`,
    HEADER_COLUMN_MISMATCH: (lineNo) => `Line ${lineNo} has wrong number of values`,
    COLUMN_IS_REQUIRED: (column) => `Column ${column} is required`
}

const getErrorsDense = (lines) => {
    const errors = [];
    errors.push(columnDataCountMatch(lines));

    return errors;
}

const getErrorsSparse = (lines, fileFormat) => {
    const errors = [];
    errors.push(...hasSparseDataColumns(lines[0], fileFormat));

    return errors;
}

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

const getSparseColumnRegExps = (fileFormat) => {
    const res = [
        { regexp: /chr(om)/gi, name: 'chrom' },
        { regexp: /start/gi, name: 'start' },
        { regexp: /end/gi, name: 'end' },
    ];

    if (fileFormat === 'segmented') {
        res.push(
            { regexp: /strand/gi, name: 'strand' },
            { regexp: /value/gi, name: 'value' }
        );
    } else if (fileFormat === 'mutationVector') {
        res.push(
            { regexp: /genes?/gi, name: 'genes' },
            { regexp: /alt(ernate)?/gi, name: 'alternate' },
            { regexp: /ref(erence)?/gi, name: 'reference' },
            { regexp: /effect/gi, name: 'effect' },
            { regexp: /dna[-_ ]*v?af/gi, name: 'dna_vaf' },
            { regexp: /rna[-_ ]*v?af/gi, name: 'rna_vaf' },
            { regexp: /amino[-_ ]*acid[-_ ]*(change)?/gi, name: 'amino_acid' }
        );
    }

    return res;
}

const getErrors = (file, contents, fileFormat) => {
    const errors = [],
        lines = contents.split('\n'),
        dataType = dataTypeByFileFormat[fileFormat],
        errCheckFunc = functionByDataType[dataType];


    errors.push(checkSizeLimit(file));
    errors.push(hasSampleColumn(getColumns(lines[0])[0]));

    errors.push(...errCheckFunc(lines, fileFormat));    

    return errors.filter(e => !!e);
}

const checkSizeLimit = (file) => {
    if (file.size >= SIZE_LIMIT) {
        return MESSAGES.FILE_SIZE_EXCEEDED(file.size, SIZE_LIMIT);
    }
}

const hasSparseDataColumns = (header, fileFormat) => {
    const colRegExps = getSparseColumnRegExps(fileFormat);
    return colRegExps.map(r => hasColumn(header, r.name, r.regexp));
}

const hasSampleColumn = header => hasColumn(header, "sampleid", /sample[ _]*(name|id)?/gi);

const hasColumn = (header, columnName, regexp) => {
    if(!header.match(regexp)) {
        return MESSAGES.COLUMN_IS_REQUIRED(columnName);
    }
}

const getColumns = line => line.split(/\t/g);
const getColumnsCount = cols => cols.length;

const columnDataCountMatch = (lines) => {
    const headerLen = getColumns(lines[0]).length;

    for (let i = 1; i < lines.length; i++) {
        if (getColumnsCount(lines[i]) !== headerLen) {
            return MESSAGES.HEADER_COLUMN_MISMATCH(i+1);
        }
    }
}

const checkUniqueSampleIDs = () => {

}
//required columns for mutation data

//required columns for segmented copy number data



export default getErrors;