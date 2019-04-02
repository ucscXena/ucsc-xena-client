'use strict';

var kmjsFunction = require('./models/km');
//Converting object to tsv
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
        tsvRows.push(values.join('\t'));
    }
    return tsvRows.join('\n');
};
/*
function findingGroup(groupTte, Tte) {
	if (groupTte.length === 2) {
		return (groupTte[1].includes(Tte) ? 'higher-line' : 'lower-line');
	}
	else if (groupTte.length === 3) {
		if (groupTte[2].includes(Tte)) {
			return 'higher-line';
		}
		return (groupTte[1].includes(Tte) ? 'middle-line' : 'lower-line');
	}
};*/
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
//This function maps the data with category
function mappingData(data) {
    let survData = data[0], geneValues = data[1];
    //var groupTte = data[2];
    const tempdata = survData.patient.map(row => ({
        //'SampleID': survival.patient.data.codes[row],
        'patient': row,
        'tte': survData.tte[survData.patient.indexOf(row)],
        'ev': survData.ev[survData.patient.indexOf(row)],
        //'Group': findingGroup(groupTte, survData.tte[survData.patient.indexOf(row)])
    }));
    //filter null ev and tte value
    const filteredData = tempdata.filter(value => value.ev != null);
    const makeData = filteredData.map(row => ({
        'Time to event': row.tte,
        'Event': row.ev,
        'Column value': geneValues[0][filteredData.indexOf(row)]
    }));
    const tsvData = objectToTsv(makeData);
    tsvdownload(tsvData);
};

function download() {
    let data = kmjsFunction.exportData();
    mappingData(data);
};

module.exports = download;
