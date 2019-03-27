'use strict';
var _ = require('./underscore_ext');

function toTsv(rows) {
    const headers = ['time', 'event', 'group'];
    rows.unshift(headers);
    let tsvRows = rows.map(row => row.join('\t'));
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


function mappingData(data, labels) {
    let survivalPara = data.map((group, i) => {
        let total = group[0].n,
            output = new Array(total);

        group.forEach((obj, k) => {
            let N = k === group.length - 1 ? 1 : obj.n - group[k + 1].n,  // number of the identical data points
                index = total - obj.n, // index position
                datapoint = [obj.t, obj.e, labels[i]];  // unique data point: time, event, group
            return output.fill(datapoint, index, index + N);
        });
        return output;
    });

    survivalPara = survivalPara.flat();
    return survivalPara;
};

function download(groups) {
    let data = _.getIn(groups, ['curves']),
        labels = _.getIn(groups, ['labels']),
        survivalPara = mappingData(data, labels);

    tsvdownload(toTsv(survivalPara));
};

module.exports = download;
