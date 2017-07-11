'use strict';

// maybe should put this in appSelector

module.exports = ({cohort, columnOrder}) => {
	if (cohort.length === 0) {
		return 'COHORT';
	}
	if (columnOrder.length === 1) { // sample column
		return 'FIRST_COLUMN';
	}
	if (columnOrder.length === 2) { // sample column + 1st column
		return 'SECOND_COLUMN';
	}
	return 'DONE';
};
