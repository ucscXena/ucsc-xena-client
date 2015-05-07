/*global module: false */
'use strict';

// selected field for annotation display
var selectedKeys = {
    "Clinvar": ["INFO.CLNSIG","INFO.SAO","INFO.CLNDBN","INFO.G5A","INFO.G5"],
    "1000_genomes": [],
    "lovd": []
};

// information comes from https://drive.google.com/uc?id=0Bzoozx2KZAPmb1NWQ1laZElzOXc&export=download

var variantSets = {
    "nextPageToken": null,
    "variantSets": [
        {
            "id": "1000_genomes",
            "datasetId": "NotImplemented",
            "metadata": [
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "VCFv4.1",
                    "key": "version",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "2",
                    "value": "",
                    "key": "INFO.CIEND",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "2",
                    "value": "",
                    "key": "INFO.CIPOS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.CS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.END",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.IMPRECISE",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.MC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "4",
                    "value": "",
                    "key": "INFO.MEINFO",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MEND",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MLEN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MSTART",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.SVLEN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.SVTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.TSD",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AC",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.NS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.AN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.EAS_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.EUR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AFR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AMR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "A",
                    "value": "",
                    "key": "INFO.SAS_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.DP",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.AA",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.VT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.EX_TARGET",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MULTI_ALLELIC",
                    "type": "Flag",
                    "id": ""
                }
            ]
        },
        {
            "id": "Clinvar",
            "datasetId": "NotImplemented",
            "metadata": [
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "VCFv4.0",
                    "key": "version",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.RS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.RSPOS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.RV",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.VP",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.GENEINFO",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.dbSNPBuildID",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {
                        0: "unspecified",
                        1: "Germline",
                        2: "Somatic",
                        3: "Both"
                    },
                    "description": "Variant Allele Origin",
                    "number": "1",
                    "value": "",
                    "key": "INFO.SAO",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.SSR",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.WGT",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.VC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.PM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.TPA",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.PMC",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.S3D",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.SLO",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSF",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSN",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.REF",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.SYN",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.U3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.U5",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.ASS",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.DSS",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.INT",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.R3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.R5",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.OTH",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.CFL",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.ASP",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MUT",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.VLD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": ">5% minor allele frequency in each and all populations",
                    "number": "0",
                    "value": "",
                    "key": "INFO.G5A",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": ">5% minor allele frequency in 1+ populations",
                    "number": "0",
                    "value": "",
                    "key": "INFO.G5",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.HD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.GNO",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.KGPhase1",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.KGPhase3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.CDA",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.LSD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MTP",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.OM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NOC",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.WTD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NOV",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CAF",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "",
                    "key": "INFO.COMMON",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNHGVS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNALLE",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNSRC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {
                        "0": "unknown",
                        "1": "germline",
                        "2": "somatic",
                        "4": "inherited",
                        "8": "paternal",
                        "16": "maternal",
                        "32": "de-novo",
                        "64": "biparental",
                        "128": "uniparental",
                        "256": "not-tested",
                        "512": "tested-inconclusive",
                        "1073741824": "other"
                    },
                    "description": "Allele Origin",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNORIGIN",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNSRCID",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {
                        "0": "Uncertain significance",
                        "1": "not provided",
                        "2": "Benign",
                        "3": "Likely benign",
                        "4": "Likely pathogenic",
                        "5": "Pathogenic",
                        "6": "drug response",
                        "7": "histocompatibility",
                        "255": "other"
                    },
                    "description": "Variant Clinical Significance",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNSIG",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNDSDB",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNDSDBID",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant disease name",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNDBN",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNREVSTAT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNACC",
                    "type": "String",
                    "id": ""
                }
            ]
        },
        {
            "id": "lovd",
            "datasetId": "NotImplemented",
            "metadata": [
                {
                    "info": {},
                    "description": "",
                    "number": "1",
                    "value": "VCFv4.0",
                    "key": "version",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.LOVD",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CSQ",
                    "type": "String",
                    "id": ""
                }
            ]
        }
    ]
};

module.exports = {
    selectedKeys: selectedKeys,
    variantSets: variantSets
};
