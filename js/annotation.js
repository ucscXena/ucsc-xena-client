// deprecated. Was used to draw ga4gh annotations.

import multi from 'multi';

function getType([type]) {
	return type;
}

const draw = multi(getType);
export { draw };
