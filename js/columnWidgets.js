
import multi from './multi.js';

var fieldTypeSelector = x => x.fieldType;
var fieldTypeOrSamplesSelector = (id, x) => id === 'samples' ? 'samples' : x.fieldType;
var columnFieldTypeOrSamplesSelector = x => x.id === 'samples' ? 'samples' : x.column.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;

const cmp = multi(fieldTypeSelector);
const index = multi(x => x);
const data = multi(fieldTypeSelector);
const transform = multi(fieldTypeSelector);
const avg = multi(fieldTypeSelector);
const download = multi(columnFieldTypeSelector);
const specialDownload = multi(columnFieldTypeSelector);
const column = multi(columnFieldTypeOrSamplesSelector);
const legend = multi(columnFieldTypeOrSamplesSelector);
const pdf = multi(fieldTypeOrSamplesSelector);

index.dflt = () => null;
avg.dflt = () => null;
data.dflt = (column, data) => data;

export { cmp, index, data, transform, avg, download, specialDownload, column, legend, pdf };
