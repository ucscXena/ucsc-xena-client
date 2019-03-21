
'use strict';
var testvalue = require('./models/km');

function objectToTsv(data) {
    const tsvRows = [];
    //Header for first row
    const headers = Object.keys(data[0]);
    tsvRows.push(headers.join('	'));

    //Loop over the rows and escapping the ',' and '"'
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        tsvRows.push(values.join('	'));

    }
    return tsvRows.join('\n');
};
//downlaod function
function tsvdownload(data) {
    const blob = new Blob([data], { type: 'text/tsv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'xenaDownload.tsv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

function mappingData(data) {
    let survData = data[0], survival = data[1];

    const tempdata = survData.patient.map(row => ({
        'SampleID': survival.patient.data.codes[row],
        'OS': survData.ev[survData.patient.indexOf(row)],
        'OS.Time': survData.tte[survData.patient.indexOf(row)],
        // Group: row.n
    }));

    const tsvData = objectToTsv(tempdata);
    tsvdownload(tsvData);
};

function download() {
    let data = testvalue.exportData();
    //console.log((data[1]).patient.data.codes[35]);
    mappingData(data);

};

module.exports = download;
