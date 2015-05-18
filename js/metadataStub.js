/*global module: false */
'use strict';

// selected field for annotation display
var selectedKeys = {
    "Clinvar": ["INFO.CLNSIG","INFO.CLNDBN","INFO.G5A","INFO.G5"]
};

// clinVar vcf: https://drive.google.com/uc?id=0Bzoozx2KZAPmb1NWQ1laZElzOXc&export=download

var variantSets = [
    {
        "referenceSetId": "",
        "id": "Clinvar",
        "datasetId": "NotImplemented",
        "metadata": [
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
                "info": {
                    "0": "uncertain significance",
                    "1": "not provided",
                    "2": "Benign",
                    "3": "Likely benign",
                    "4": "Likely pathogenic",
                    "5": "Pathogenic",
                    "6": "Drug response",
                    "7": "Histocompatibility",
                    "255": "Other"
                },
                "description": "Variant Clinical Significance",
                "number": ".",
                "value": "",
                "key": "INFO.CLNSIG",
                "type": "String",
                "id": ""
            }
        ]
    }
];


module.exports = {
    selectedKeys: selectedKeys,
    variantSets: variantSets
};
