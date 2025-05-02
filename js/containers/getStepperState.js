
// maybe should put this in appSelector

export default ({cohort, columnOrder}) => {
	if (cohort == null) {
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
