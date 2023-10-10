
var ignoredType = ["probeMap", "probemap", "genePredExt"];

var phenoPat = /^phenotype/i;
var isPhenotype = ({type, dataSubType}) => type === 'clinicalMatrix' &&
		(!dataSubType || dataSubType.match(phenoPat));

module.exports = {
	ignoredType,
	isPhenotype
};
