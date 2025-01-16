var {identity, Let, merge, updateIn} = require('../underscore_ext').default;

import styles from './Integrations.module.css';
import {tableLayout} from './muiTable';

var headers = ['Name', 'Donors', 'Cells/Dots', 'Data types'];

var number = n => [{className: styles.number}, n.toString()];

var cohortRow = ({donors, cells, assays}) => [number(donors), number(cells), assays];

var studyProp = isStudy => ({className: isStudy ? styles.study : styles.sub});
var labelRow = label => label && [studyProp(true), label, '', '', ''];

// remove falsy elements
var ident = a => a.filter(e => e);

var addSelected = props => updateIn(props, ['className'],
	cn => ident([cn, styles.selected]).join(' '));

var setHighlight = (highlight, onClick, i) =>
	Let((addSel = highlight === i ? addSelected : identity) =>
		row => updateIn(row, [0], props =>
			merge(addSel(props),
				{onClick: ev => onClick(ev, i), onDoubleClick: ev => onClick(ev, i)})));

var studyRows = (highlight, onClick) => ({label, studies}, i) => ident([
	labelRow(label),
	...studies.map(({label: l2, cohorts: [first, ...rest]}) =>
		[[studyProp(!label),
			[{rowSpan: rest.length + 1}, l2], ...cohortRow(first)],
		 ...rest.map(c => [{}, ...cohortRow(c)])]).flat()
]).map(setHighlight(highlight, onClick, i));

export default ({list, onHighlight: onClick, highlight}) =>
	tableLayout({className: styles.table},
		headers,
		list.map(studyRows(highlight, onClick)).flat());
