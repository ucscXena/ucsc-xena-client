/*global require: false, module: false */
/*eslint new-cap: [0], camelcase: [0] */
'use strict';
var S = require('schema-shorthand').schema;
console.log(S);
console.log(Object.keys(S));
var {desc, fn, string, array, arrayOf, number, or, nullval, boolean, role, object} = S;

var dsID = desc('dsID', 'JSON encoded host and dataset id',
			string(/{"host":".*","name":".*"}/));

var ColumnID = desc(
	'ColumnID', 'UUID for identifying columns',
	string(/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/)
);

var Column = desc(
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
	fields: arrayOf(string()),
	fieldLabel: {
		user: string(),
		default: string()
	},
	columnLabel: {
		user: string(),
		default: string()
	}}));


var Columns = desc(
	'Columns', 'A set of columns', S({
		[ColumnID]: Column
	}));

//var Cohorts = desc(
//	'Cohorts', 'A set of cohorts', arrayOf(string())
//);
//
//var ColumnOrder = desc(
//	arrayOf('/[-0-9a-f]+/')
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
var Dataset = desc(
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
		server: string(),
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

var FeatureName = desc(
	'FeatureName', 'Name of a feature. Should be unique in the dataset.',
	string()
);

var Feature = desc(
	'Feature', 'Phenotype metdata',
	S({
		[FeatureName]: {
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

var FeaturesByDataset = desc(
	'FeaturesByDataset', 'Phenotype metadata, indexed by dataset',
	S({
		[dsID]: Feature
	})
);

var FeatureID = desc(
	'FeatureID', 'Primary key for a feature',
	S({
		dsID: dsID,
		name: FeatureName
	}));

var SampleID = desc(
	'SampleID', 'A sample id. Must be unique within a cohort',
	string()
);

var HeatmapData = desc(
	'HeatmapData', 'Matrix of values for heatmap display, ordered by field and sample.',
	arrayOf(role('field', arrayOf(role('sample', number()))))
);

var ColorSpec = desc(
	'ColorSpec', 'A color scale variant.',
	or(
		array('float-pos', role('low', number()), role('high', number()), role('min', number()), role('max', number())),
		array('float-neg', role('low', number()), role('high', number()), role('min', number()), role('max', number())),
		array('float', role('low', number()), role('zero', number()), role('high', number()), role('min', number()), role('max', number())),
		array('float-thresh-pos', role('zero', number()), role('high', number()), role('min', number()), role('threshold', number()), role('max', number())),
		array('float-thresh-neg', role('low', number()), role('zero', number()), role('min', number()), role('threshold', number()), role('max', number())),
		array('float-thresh', role('low', number()), role('zero', number()), role('high', number()), role('min', number()), role('minThreshold', number()), role('maxThreshold', number()), role('max', number())),
		array('ordinal', role('count', number([0])))
	)
);

var colorString = desc(
	'colorString', 'A css color string',
	or(string(/#[0-9A-Fa-f]{6}/), string())
);

var Gene = desc('Gene', 'A gene name', string());
var Probe = desc('Probe', 'A probe name', string());
var Field = desc('Field', 'A gene or probe name', or(Gene, Probe));

var ProbeData = desc(
	'ProbeData', 'Data for a probe column',
	S({
		req: {
			mean: {
				[Field]: number()
			},
			probes: arrayOf(string()),
			values: {
				[Field]: {
					[SampleID]: number() // or null? or NaN?
				}
			}
		},
		features: Feature,
		codes: arrayOf('FIXME'), // XXX wrong
		bounds: arrayOf('FIXME'), // XXX wrong
		display: {
			colors: arrayOf(ColorSpec),
			heatmap: HeatmapData
		}
	}));

// XXX why is this not rendered as <em>string /[ACTG]*/</em>?
var Sequence = desc(
	'Sequence', 'String representation of a sequence',
	string(/[ACTG]*/)
);

var BasePosition = desc(
	'BasePosition', 'Base position',
	number([0])
);

var Mutation = desc(
	'Mutation', 'Mutation record',
	S({
		alt: Sequence,
		amino_acid: string(),
		chr: string(),
		dna_vaf: or(nullval, number()),
		effect: string(), // should be enum
		end: BasePosition,
		gene: Gene,
		reference: Sequence,
		rna_vaf: or(nullval, number()),
		sample: SampleID,
		start: BasePosition
	})
);

var RefGene = desc(
	'RefGene', 'A refGene annotation',
	S({
		cdsEnd: BasePosition,
		cdsStart: BasePosition,
		exonCount: number([0]),
		exonEnds: [BasePosition],
		exonStarts: [BasePosition],
		name2: Gene,
		strand: or(nullval, '-', '+'),
		txEnd: BasePosition,
		txStart: BasePosition
	})
);

var MutationData = desc(
	'MutationData', 'Data for a mutation column',
	S({
		req: object({
			samples: {[SampleID]: boolean}, // XXX should be true, not boolean
			rows: [Mutation]
		}),
		refGene: {
			[Field]: RefGene
		}
	})
);


// for sort, index by sample
// 	  also compute sort?
//
// XXX oh, fudge. If we move this outside app data, then the sort is
// also outside app data. Which is correct, but what does it break?
var MutationViewData = desc(
	'MutationViewData', 'Data for the mutation view',
	S({
		index: {},
		order: {[SampleID]: number(0)},
		refGene: RefGene
	})
);

var VizSettings = desc(
	'VizSettings', 'User settings for visualization',
	S({
		max: number(),
		maxStart: or(number(), nullval),
		minStart: or(number(), nullval),
		min: number(),
		colNormalization: or(boolean, nullval)
	})
);

var Application = desc(
	'Application', 'The application state',
	S({
		cohort: string(),
		cohorts: arrayOf(string()),
		columnOrder: arrayOf(ColumnID),
		columns: Columns,
		data: {
			[ColumnID]: or(ProbeData, MutationData)
		},
		datasets: {
			[dsID]: Dataset
		},
		features: FeaturesByDataset,
		km: {
			id: ColumnID,
			column: or(ProbeData, MutationData),
			label: string(),
			vars: {
				event: FeatureID,
				patient: FeatureID,
				tte: FeatureID
			}
		},
		samples: arrayOf(string()),
		samplesFrom: or(string(), nullval),
		servers: {
			default: arrayOf(string()),
			user: arrayOf(string())
		},
		zoom: {
			count: number([0]),
			height: number([0]),
			index: number([0])
		},
		vizSettings: VizSettings
	})
);

var KmPoint = desc(
	'KmPoint', 'A time point in a KM result. t: time; s: % surviving at t; e: event at t', S({
		d: number(),
		e: role('event at time t', boolean),
		n: role('number in study at time t', number()),
		rate: or(nullval, number()),
		s: role('% surviving at time t', number()),
		t: role('time', number())
	})
)

var KmPlotData = desc(
	'KmPlotData', 'Data for drawing KM', 
	S({
		ev: FeatureID,
		tte: FeatureID,
		patient: FeatureID,
		id: ColumnID,
		label: string(),
		groups: {
			colors: [colorString],
			labels: [string()],
			curves: [[KmPoint]]
		}
	})
);
//
//var BasePos = desc('base position', number([0]));
var Chrom = desc('Chrom', 'chrom', string(/chr[0-9]+/));

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
//var GenomicPosition = desc(
//	'GenomicPosition', 'genomic position (intent)',
//	or(
//		array('probes', arrayOf(Probe)),
//		array('gene', arrayOf(Gene)),
//		array('exons', Gene),
//		array('chrom', Chrom, desc('start', BasePos), desc('end', BasePos))
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

//var ChromIntervals = desc(
//	'chrom intervals', {
//		chrom: string(),
//		intervals: arrayOf(
//			array(BasePos, BasePos)
//		)
//	}
//);

//
//var PixelPos = desc('pixel offset', number([0]));

//var Partition = arrayOf(array(PixelPos, PixelPos));

// XXX note that role() and desc() defeat the reference equality check when inlining schema. Ouch.
var ChromLayout = desc('ChromLayout', 'A chromosome layout. Currently limited to a single chrom.',
					S([[role('start', BasePosition), role('end', BasePosition)]])
				   );

var ScreenLayout = desc('ScreenLayout', 'A screen layout',
					S([[role('start px', number([0])), role('end px', number([0]))]])
					);

var Layout = desc('Layout', 'Screen and chrom layout',
			  S({chrom: ChromLayout, screen: ScreenLayout, reversed: boolean}));

var Action = desc('Action', 'Action on state',
				 [role('type', string())]);

var KmPlotProps = desc('KmPlotProps', 'KmPlot Component properties',
	S({
		callback: role('State updater', fn(Action)),
		eventClose: role('Action type to issue on "close"', string()),
		features: FeaturesByDataset,
		km: KmPlotData
	})
);

module.exports = [
	dsID,
	Column,
	Gene,
	Probe,
	Field,
	Chrom,
	Dataset,
	Feature,
	FeatureID,
	FeatureName,
	FeaturesByDataset,
	SampleID,
	ColumnID,
	ColorSpec,
	HeatmapData,
	ProbeData,
	BasePosition,
	Sequence,
	RefGene,
	Mutation,
	MutationData,
	MutationViewData,
	VizSettings,
	Application,
	ChromLayout,
	ScreenLayout,
	Layout,
	colorString,
	KmPoint,
	KmPlotData,
	KmPlotProps,
	Action
];
