'use strict';
import React from 'react';
import cssClasses from './ImportPage.module.css';

const maxColumns = 4,
    numRows = 5,
    maxNumRows = 20;

const cropLines = lines => lines.map(l => l.length > maxColumns ? l.slice(0, maxColumns) : l);

// To keep proper table shape when some columns are missing
const padLines = lines => {
    const maxLines = Math.max(...lines.map(l => l.length));
    lines = cropLines(lines);
    return lines.map(line => {
        const diff = maxLines - line.length;
        return diff > 0 ? [...line, ...Array(diff).fill(" ")] : line;
    });
};

class DenseTable extends React.Component {
    state = { showMore: false };

    onShowMore = () => this.setState({showMore: !this.state.showMore});

    render() {
        const { fileContent, highlightRow, highlightColumn } = this.props,
            lineCount = this.state.showMore ? maxNumRows : numRows;

        let lines = fileContent.split('\n', lineCount)
                            .map(line => line.split(/\t/g));
        lines = padLines(lines);

        const tableRows = lines.map((r, i) => (
            <tr key={i}>
                {
                    r.map((rr, j) => <td key={j}
                        className={highlightRow && i === 0 || highlightColumn && j === 0 ? cssClasses.highlighted : null}>
                        {rr}</td>
                    )
                }
            </tr>)
        );

        return (
            <div>
                <table className={cssClasses.denseExample}>
                    <tbody>
                        {tableRows}
                    </tbody>
                </table>
               {this.renderShowMore()}
            </div>
        );
    }

    renderShowMore() {
        return (
            this.props.disableShowMore ? null :
            <i className={cssClasses.showMore} onClick={this.onShowMore}>
                {this.state.showMore ? "Show less..." : "Show more..."}
            </i>
        );
    }
};

export {
    DenseTable
};
