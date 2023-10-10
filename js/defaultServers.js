export const servers = {
	oldLocalHub: 'https://local.xena.ucsc.edu:7223',
	localHub: 'http://127.0.0.1:7222',
	publicHub: 'https://ucscpublic.xenahubs.net',
	tcgaHub: 'https://tcga.xenahubs.net',
	icgcHub: 'https://icgc.xenahubs.net',
	toilHub: 'https://toil.xenahubs.net',
	pcawgHub: 'https://pcawg.xenahubs.net',
	singlecellHub: 'https://singlecellnew.xenahubs.net',
	pancanAtlasHub: 'https://pancanatlas.xenahubs.net',
	treehouseHub: 'https://xena.treehouse.gi.ucsc.edu:443',
	gdcHub: "https://gdc.xenahubs.net",
	atacSeqHub: "https://atacseq.xenahubs.net",
	kidsFirstHub: "https://kidsfirst.xenahubs.net",
	notebook: "notebook:"
};

export const serverNames = {
	[servers.localHub]: "My computer hub",
	[servers.publicHub]: 'UCSC Public Hub',
	[servers.tcgaHub]: 'TCGA Hub',
	[servers.icgcHub]: 'ICGC Hub',
	[servers.toilHub]: 'UCSC Toil RNA-seq Recompute',
	[servers.pcawgHub]: 'PCAWG Hub',
	[servers.singlecellHub]: 'Single-cell RNAseq Hub',
	[servers.pancanAtlasHub]: 'Pan-Cancer Atlas Hub',
	[servers.treehouseHub]: 'Treehouse Hub',
	[servers.gdcHub]: 'GDC Hub',
	[servers.atacSeqHub]: 'ATAC-seq Hub',
	[servers.kidsFirstHub]: 'Kids First Hub',
	[servers.notebook]: 'jupyter notebook'
};

export const serverS3url = {
	[servers.publicHub]: 'https://ucsc-public-main-xena-hub.s3.us-east-1.amazonaws.com/download',
	[servers.tcgaHub]: 'https://tcga-xena-hub.s3.us-east-1.amazonaws.com/download',
	[servers.icgcHub]: 'https://icgc-xena-hub.s3.us-east-1.amazonaws.com/download',
	[servers.toilHub]: 'https://toil-xena-hub.s3.us-east-1.amazonaws.com/download',
	[servers.pcawgHub]: 'https://pcawg-hub.s3.us-east-1.amazonaws.com/download',
	//[servers.singlecellHub]: 'Single-cell RNAseq Hub',
	[servers.pancanAtlasHub]: 'https://tcga-pancan-atlas-hub.s3.us-east-1.amazonaws.com/download',
	[servers.gdcHub]: 'https://gdc-hub.s3.us-east-1.amazonaws.com/download',
	[servers.atacSeqHub]: 'https://tcgaatacseq.s3.us-east-1.amazonaws.com/download',
	[servers.kidsFirstHub]: 'https://kidsfirstxena.s3.us-east-1.amazonaws.com/download'
};

export const defaultServers = [
	servers.localHub,
	servers.publicHub,
	servers.tcgaHub,
	servers.pancanAtlasHub,
	servers.icgcHub,
	servers.pcawgHub,
	servers.toilHub,
	servers.treehouseHub,
	servers.gdcHub,
	servers.atacSeqHub,
	servers.kidsFirstHub,
	servers.notebook
];

export const enabledServers = [
	servers.localHub,
	servers.publicHub,
	servers.tcgaHub,
	servers.pancanAtlasHub,
	servers.icgcHub,
	servers.pcawgHub,
	servers.toilHub,
	servers.gdcHub,
	servers.atacSeqHub,
	servers.kidsFirstHub,
	servers.notebook
];

export const publicServers = [
	servers.publicHub,
	servers.tcgaHub,
	servers.icgcHub,
	servers.toilHub,
	servers.pancanAtlasHub,
	servers.pcawgHub,
	servers.treehouseHub,
	servers.gdcHub,
	servers.atacSeqHub,
	servers.singlecellHub,
	servers.kidsFirstHub,
	'https://tdi.xenahubs.net',
	'https://luad.xenahubs.net',
	'https://preview.xenahubs.net'
];
