'use strict';

var servers = {
	localHub: 'https://local.xena.ucsc.edu:7223',
	publicHub: 'https://ucscpublic.xenahubs.net:443',
	tcgaHub: 'https://tcga.xenahubs.net:443',
	icgcHub: 'https://icgc.xenahubs.net:443',
	toilHub: 'https://toil.xenahubs.net:443',
	pcawgHub: 'https://pcawg.xenahubs.net:443',
	singlecellHub: 'https://singlecell.xenahubs.net:443',
	pancanAtlasHub: 'https://pancanatlas.xenahubs.net:443'
};

module.exports = {
	serverNames: {
		[servers.localHub]: "My computer hub",
		[servers.publicHub]: 'UCSC public hub',
		[servers.tcgaHub]: 'TCGA hub',
		[servers.icgcHub]: 'ICGC hub',
		[servers.toilHub]: 'GA4GH (TOIL) hub',
		[servers.pcawgHub]: 'PCAWG public hub',
		[servers.singlecellHub]: 'Single-cell RNAseq hub',
		[servers.pancanAtlasHub]: 'PanCanAtlas Hub'
	},
	defaultServers: [
		servers.localHub,
		servers.publicHub,
		servers.tcgaHub,
		servers.icgcHub,
		servers.toilHub
	]
};
