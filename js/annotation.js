// deprecated. Was used to draw ga4gh annotations.
/*global require: false, module: false */
import multi from 'multi';

function getType([type]) {
	return type;
}

const draw = multi(getType);
export { draw };
