'use strict';
import React from 'react';

import cssClasses from './ImportPage.module.css';

const styles = {
    coloredColumns: {
        color: '#1a535c'
    },
    header: {
        fontWeight: 'bold',
        padding: '5px'
    },
    td: {
        padding: '5px'
    }
};

const header = ['sample', 'samples', 'sample_type'];
let data = [
    ['TCGA-E9-A3HO-01A', 'TCGA-E9-A3HO-01A', 'Primary Tumor'],
    ['TCGA-BH-A0BW-01A', 'TCGA-BH-A0BW-01A', 'Primary Tumor'],
    ['TCGA-BH-A1FN-01A', 'TCGA-BH-A1FN-01A', 'Primary Tumor']
];

class DenseTable extends React.Component {
    constructor() {
        super();
        this.lastRows = [];
    }

    render() {
        let rows = [],
            visible = this.props.visible,
            reverse = this.props.reverse;

        if (reverse) {
            rows = data.map((r, i) => [header[i], ...r]);
        } else {
            rows = [header, ...data];
        }

        const tableClass = visible ? [cssClasses.denseExample, cssClasses.denseExampleShow].join(' ') : cssClasses.denseExample;
        const tableRows = rows.map((r, i) => (
            <tr key={i}>
                {
                    r.map((rr, j) => <td key={j} style={i === 0 && !reverse || j === 0 && reverse ? styles.header : styles.td}>{rr}</td>)
                }
            </tr>)
        );

        //for situation when table is reversed during 'disappear' animation
        if (visible) {
            this.lastRows = tableRows;
        }

        return (
            <table className={tableClass}>
                <tbody>
                    {this.lastRows}
                </tbody>
            </table>
        );
    }
};

export {
    DenseTable
};
