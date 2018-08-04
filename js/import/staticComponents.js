'use strict';
import React from 'react';
import cssClasses from './ImportPage.module.css';

const maxColumns = 4,
    numRows = 5,
    maxNumRows = 20,
    maxSymbolsInCell = 30;

const cropColumnContent = cell => cell.length > maxSymbolsInCell ? cell.slice(0, maxSymbolsInCell) + '...' : cell;
const cropLines = lines => lines.map(line => {
    const cropped = line.length > maxColumns ? line.slice(0, maxColumns) : line;
    return cropped.map(cropColumnContent);
});


// To keep proper table shape when some columns are missing
const padLines = lines => {
    const maxLines = Math.min(Math.max(...lines.map(l => l.length)), maxColumns);
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
            takeLines = this.state.showMore ? maxNumRows : numRows;

        let lines = fileContent.split(/\r\n|\r|\n/g);
        let lineCount = lines.length;
        lines = lines.slice(0, takeLines).map(line => line.split(/\t/g));
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
               {this.renderShowMore(lineCount > numRows)}
            </div>
        );
    }

    renderShowMore(hasEnoughLines) {
        return (
            !hasEnoughLines ? null :
            <i className={cssClasses.showMore} onClick={this.onShowMore}>
                {this.state.showMore ? "Show less..." : "Show more..."}
            </i>
        );
    }
};

export {
    DenseTable
};
