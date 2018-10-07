'use strict';
import React from 'react';
import cssClasses from './ImportPage.module.css';
import { ProgressBar } from 'react-toolbox/lib';

const maxColumns = 6,
    numRows = 5,
    maxNumRows = 20,
    maxSymbolsInCell = 20;

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

const getSimpleTableRows = lines => lines.map((line, i) => (
    <tr key={i}>
        {line.map((col, j) => <td key={j}>{col}</td>)}
    </tr>
));

class FilePreview extends React.Component {
    state = { showMore: false };

    onShowMore = () => this.setState({showMore: !this.state.showMore});

    render() {
        const { fileContent, highlightRow, highlightColumn, isLoading } = this.props,
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
            isLoading ?
                <div style={{ textAlign: 'center' }}>
                    <ProgressBar type="circular" mode="indeterminate" />
                </div>
                : <div>
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

const ErrorPreview = ({ errorSnippets = [] }) => {

    if (!errorSnippets.length) {
        return null;
    }

    const { errorLines, exampleLines } = errorSnippets[0];

    const errLines = getSimpleTableRows(padLines(errorLines));
    const exampLines = getSimpleTableRows(padLines(exampleLines));

    return (
        <div>
            <p>Your file:</p>
            <table className={cssClasses.denseExample} style={{background: '#f69292'}}>{ errLines }</table>

            <p>Example of correct file:</p>
            <table className={cssClasses.denseExample} style={{background: '#c7f2c7'}}>{ exampLines }</table>
        </div>
    );
};

export {
    FilePreview,
    ErrorPreview
};
