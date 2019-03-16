
'use strict';
var _ = require('./underscore_ext');

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

//Generating Sample ID
var id = 0;
function generateID() {
    id += 1;
    return (id);
};

function lineGroup({ g }) {
    var [, , curve] = g,
        censors = curve.filter(pt => !pt.e);

    const data = censors.map(row => ({
        SampleID: generateID(),
        OS: row.s,
        Time: row.t,
        Group: row.n
    }
    ));

    id = 0;
    const tsvData = objectToTsv(data);
    tsvdownload(tsvData);
};
function download({ colors, labels, curves }) {
    _.each(_.zip(colors, labels, curves), g => {
        lineGroup({ g });
    });


};

module.exports = download;
