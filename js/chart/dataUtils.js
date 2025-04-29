var groupValues = (field, groups) =>
	groups.map(indices => indices.map(i => field[i]).filter(x => !isNaN(x)));

export { groupValues };
