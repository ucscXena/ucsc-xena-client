/* eslint-disable */
const SIZE_LIMIT = 1000;

const MESSAGES = {
    FILE_SIZE_EXCEEDED: (size, allowedSize) => `File is too large: ${size} (allowed ${allowedSize})`,
    HEADER_COLUMN_MISMATCH: (lineNo) => `Line ${lineNo} has wrong number of values`,
    COLUMN_IS_REQUIRED: (column) => `Column ${column} is required`
}

const getErrors = (file, contents) => {
    const errors = [],
        lines = contents.split('\n');

    errors.push(checkSizeLimit(file));
    errors.push(checkHeaderColumnMatch(lines));
    // first column ?
    errors.push(checkHeader(getColumns(lines[0])[0]));

    return errors.filter(e => !!e);
}

const checkSizeLimit = (file) => {
    if (file.size >= SIZE_LIMIT) {
        return MESSAGES.FILE_SIZE_EXCEEDED(file.size, SIZE_LIMIT);
    }
}

const checkHeader = header => {
    if(!header.match(/sample[ _]*(name|id)?/gi)) {
        return MESSAGES.COLUMN_IS_REQUIRED("'sampleid'");
    }
}

const getColumns = line => line.split(/\t/g);
const getColumnsCount = cols => cols.length;

const checkHeaderColumnMatch = (lines) => {
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