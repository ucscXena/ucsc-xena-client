/*global require: false, module: false */
/*eslint new-cap: [0] */
'use strict';
var S = require('schema-shorthand').schema;
var {d, string, array, number, or, nullval, boolean} = S;

var dsID = d('dsID', 'JSON encoded host and dataset id',
			string(/{"host":".*","name":".*"}/));

var ColumnID = d(
	'ColumnID', 'UUID for identifying columns',
	string(/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/)
);

var Column = d(
	'Column', 'A column for display', S({
	dsID: dsID,
	width: number([0]),
	dataType: or(
		'mutationVector',
		'geneMatrix',
		'probeMatrix',
		'geneProbeMatrix',
		'clinicalMatrix'
	),
	fields: array.of(string()),
	fieldLabel: {
		user: string(),
		default: string()
	},
	columnLabel: {
		user: string(),
		default: string()
	}}));


var Columns = d(
	'Columns', 'A set of columns', S({
		'<ColumnID>': Column
	}));

//var Cohorts = d(
//	'Cohorts', 'A set of cohorts', array.of(string())
//);
//
//var ColumnOrder = d(
//	array.of('/[-0-9a-f]+/')
//);

var DataSubType = or(
	'copy number (gene-level)',
	'somatic non-silent mutation (gene-level)',
	'gene expression',
	'phenotype',
	'somatic mutation (SNPs and small INDELs)',
	'miRNA expression RNAseq',
	'DNA methylation',
	'somatic mutation',
	'miRNA expression',
	'exon expression RNAseq',
	'copy number',
	'gene expression RNAseq',
	'PARADIGM pathway activity',
	'protein expression RPPA',
	'gene expression array',
	'somatic mutation (SNP and small INDELs)',
	'gene expression Array');

// XXX There is also datasubtype. WTF is that?
var Dataset = d(
	'Dataset', 'Dataset metadata',
	S({
		articletitle: string(),
		author: string(),
		citation: string(),
		cohort: string(),
		dataSubType: DataSubType,
		dataproducer: string(),
		datasubtype: 'not sure why this is here',
		description: string(),
		dsID: dsID,
		label: string(),
		name: string(),
		probemap: or(string(), nullval),
		status: or('loading', 'loaded', 'error'),
		type: or('genomicMatrix',
				'genomicSegment',
				'probeMap',
				'clinicalMatrix',
				'genePredExt',
				'mutationVector'),
		url: string()
	})
);

var FeatureName = d(
	'FeatureName', 'Name of a feature. Should be unique in the dataset.',
	string()
);

var Feature = d(
	'Feature', 'Phenotype metdata',
	S({
		'<FeatureName>': {
			// XXX why field_id?
			field_id: number(), // eslint-disable-line camelcase
			id: number(), // XXX why?
			longtitle: string(),
			name: string(),
			priority: number([0]),
			shorttitle: string(),
			valuetype: or('category', 'float'),
			visibility: or('off', 'on', nullval)
		}
	})
);

var FeatureID = d(
	'FeatureID', 'Primary key for a feature',
	S({
		dsID: dsID,
		name: FeatureName
	}));

var SampleID = d(
	'SampleID', 'A sample id. Must be unique within a cohort',
	string()
);

var HeatmapData = d(
	'HeatmapData', 'Matrix of values for heatmap display, ordered by field and sample.',
	array.of(array.of(number()))
);

var ProbeData = d(
	'ProbeData', 'Data for a probe column',
	S({
		metadata: Dataset, // XXX why is this here?
		req: {
			mean: {
				'<GeneOrProbe>': number()
			},
			probes: array.of(string()),
			values: {
				'<GeneOrProbe>': {
					'<SampleID>': number() // or null? or NaN?
				}
			},
			display: HeatmapData
		}
	}));

var MutationData = d(
	'MutationData', 'Data for a mutation column',
	S({
	})
);
var VizSettings = d(
	'VizSettings', 'User settings for visualization',
	S({
		max: number(),
		maxStart: or(number(), nullval),
		minStart: or(number(), nullval),
		min: number(),
		colNormalization: or(boolean, nullval)
	})
);

var Application = d(
	'Application', 'The application state',
	S({
		cohort: string(),
		cohorts: array.of(string()),
		columnOrder: array.of(ColumnID),
		columns: Columns,
		data: {
			'<ColumnID>': or(ProbeData, MutationData)
		},
		datasets: {
			datasets: {
				'<dsID>': Dataset
			},
			servers: array.of({
				server: string(),
				datasets: array.of(Dataset)
			})
		},
		features: {
			'<dsID>': Feature
		},
		km: {
			vars: {
				event: FeatureID,
				patient: FeatureID,
				tte: FeatureID
			}
		},
		samples: array.of(string()),
		samplesFrom: or(string(), nullval),
		servers: {
			default: array.of(string()),
			user: array.of(string())
		},
		zoom: {
			count: number([0]),
			height: number([0]),
			index: number([0])
		},
		vizSettings: VizSettings
	})
);
//
//
var Gene = d('Gene', 'A gene name', string());
var Probe = d('Probe', 'A probe name', string());
var GeneOrProbe = d('GeneOrProbe', 'A gene or probe name', or(Gene, Probe));
//var BasePos = d('base position', number([0]));
var Chrom = d('Chrom', 'chrom', string(/chr[0-9]+/));

// Where does 'description' live? On parameter, or on schema? If both, does d() overwrite
// the one on the schema?

// This describes user intent. Currently, we have only 'fields', which can be probes or genes.
// clinicalMatrix [field]
// mutationVector [field]
// probeMatrix [field...]
// geneProbeMatrix [field]
// geneMatrix [field...]  <-- can be converted to geneProbeMatrix if length 1
// field has type probe if type in [clinicalMatrix, probeMatrix]
// field has type gene if type in [mutationVector, geneProbeMatrix, geneMatrix]
//
// The widget can interpret this, e.g. probes in gene, exons in gene.
//
// If the widget can interpret this in different ways (gene, probes in gene, exons), it has to inform the annotation tracks
// somehow. Who defines the layout? The widget? The annotation? Or something above the two, that combines data type,
// user intent, and widgets? Why would you write it one way (widget defines the layout) vs. another (separate module
// defines the layout)? I really don't want the annotation to be holding a reference to the widget. So, need
// a layout separate from that.
//
// We could use different data types for field vs array of field. That would allow a widget to register
// for just field, not array of field. otoh, we will likely need widgets to display 'unsupported' messages
// even with this refinement, because all combinations will not be supportable by every widget.
//
// The first thing I will want to do is register widgets based on 1 vs many. So, seems useful to use a data tag. An
// alternative is to dispatch on fields lengths.
//
//var GenomicPosition = d(
//	'GenomicPosition', 'genomic position (intent)',
//	or(
//		array('probes', array.of(Probe)),
//		array('gene', array.of(Gene)),
//		array('exons', Gene),
//		array('chrom', Chrom, d('start', BasePos), d('end', BasePos))
//	)
//);

// Types of layouts
// genes, equally spaced
// gene, exon view
// gene, chrom view
// probes, equally spaced
// genes, proportional ?
// probes, proportional ?

// Should position variant identify the type of the fields? Or the type and the layout? Or should layout be separate?
// gene vs exons => variant identifies layout.
// ['genes', 'fixed']
// ['genes', 'exon']  // only one
// ['genes', 'chrom'] // only one
// ['probes', 'fixed']
// ['probes',
// Note that a multimethod could dispatch on an array.

// ChromPosition is internally converted to an array of (start, end)
//var ChromIntervals = d(
//	'chrom intervals', {
//		chrom: string(),
//		intervals: array.of(
//			array(BasePos, BasePos)
//		)
//	}
//);
//
//var PixelPos = d('pixel offset', number([0]));

//var Partition = array.of(array(PixelPos, PixelPos));

//var ChromLayout = S({
//    intervals: ChromIntervals,
//    partition: Partition});

module.exports = {
	dsID: dsID,
	Column: Column,
//	GenomicPosition: GenomicPosition,
	Gene: Gene,
	Probe: Probe,
	GeneOrProbe: GeneOrProbe,
	Chrom: Chrom,
	Dataset: Dataset,
	Feature: Feature,
	FeatureID: FeatureID,
	FeatureName: FeatureName,
	SampleID: SampleID,
	ColumnID: ColumnID,
	HeatmapData: HeatmapData,
	ProbeData: ProbeData,
	MutationData: MutationData,
	VizSettings: VizSettings,
	Application: Application
};
