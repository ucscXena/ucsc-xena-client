'use strict';

var servers = {
	localHub: 'https://local.xena.ucsc.edu:7223',
	publicHub: 'https://ucscpublic.xenahubs.net',
	tcgaHub: 'https://tcga.xenahubs.net',
	icgcHub: 'https://icgc.xenahubs.net',
	toilHub: 'https://toil.xenahubs.net',
	pcawgHub: 'https://pcawg.xenahubs.net',
	singlecellHub: 'https://singlecell.xenahubs.net',
	pancanAtlasHub: 'https://pancanatlas.xenahubs.net',
	treehouseHub: 'https://xena.treehouse.gi.ucsc.edu:443',
	gdcHub: "https://gdc.xenahubs.net",
	atacSeqHub: "https://atacseq.xenahubs.net"
};

module.exports = {
	servers,
	serverNames: {
		[servers.localHub]: "My computer hub",
		[servers.publicHub]: 'UCSC public hub',
		[servers.tcgaHub]: 'TCGA hub',
		[servers.icgcHub]: 'ICGC hub',
		[servers.toilHub]: 'UCSC Toil RNAseq Recompute',
		[servers.pcawgHub]: 'PCAWG public hub',
		[servers.singlecellHub]: 'Single-cell RNAseq hub',
		[servers.pancanAtlasHub]: 'Pan-Cancer Atlas Hub',
		[servers.treehouseHub]: 'Treehouse Hub',
		[servers.gdcHub]: 'GDC Hub'
	},
	defaultServers: [
		servers.localHub,
		servers.publicHub,
		servers.tcgaHub,
		servers.pancanAtlasHub,
		servers.icgcHub,
		servers.toilHub,
		servers.treehouseHub,
		servers.gdcHub,
		servers.atacSeqHub
	],
	enabledServers: [
		servers.localHub,
		servers.publicHub,
		servers.tcgaHub,
		servers.pancanAtlasHub,
		servers.icgcHub,
		servers.toilHub,
		servers.gdcHub,
		servers.atacSeqHub
	],
	publicServers: [
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
		'https://tdi.xenahubs.net'
	]
};
