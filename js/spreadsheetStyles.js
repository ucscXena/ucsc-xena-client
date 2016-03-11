// Styles shared by the spreadsheet viz & pdf output.
//
/*global require: false, module: false */
'use strict';

// XXX This isn't the correct margin. It's the observed space
// between columns on-screen. We need to review the css for
// the columns, move it in here, render with react instead of
// style sheets, and use it for spreadsheet pdf.
module.exports = {
	column: {
		margin: 11
	}
};
