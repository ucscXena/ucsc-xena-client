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
            "referenceSetId": "",
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
                    "description": "Confidence interval around END for imprecise variants",
                    "number": "2",
                    "value": "",
                    "key": "INFO.CIEND",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Confidence interval around POS for imprecise variants",
                    "number": "2",
                    "value": "",
                    "key": "INFO.CIPOS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Source call set.",
                    "number": "1",
                    "value": "",
                    "key": "INFO.CS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "End coordinate of this variant",
                    "number": "1",
                    "value": "",
                    "key": "INFO.END",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Imprecise structural variation",
                    "number": "0",
                    "value": "",
                    "key": "INFO.IMPRECISE",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Merged calls.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.MC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mobile element info of the form NAME,START,END<POLARITY; If there is only 5' OR 3' support for this call, will be NULL NULL for START and END",
                    "number": "4",
                    "value": "",
                    "key": "INFO.MEINFO",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mitochondrial end coordinate of inserted sequence",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MEND",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Estimated length of mitochondrial insert",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MLEN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mitochondrial start coordinate of inserted sequence",
                    "number": "1",
                    "value": "",
                    "key": "INFO.MSTART",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "SV length. It is only calculated for structural variation MEIs. For other types of SVs; one may calculate the SV length by INFO:END-START+1, or by finding the difference between lengthes of REF and ALT alleles",
                    "number": ".",
                    "value": "",
                    "key": "INFO.SVLEN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Type of structural variant",
                    "number": "1",
                    "value": "",
                    "key": "INFO.SVTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Precise Target Site Duplication for bases, if unknown, value will be NULL",
                    "number": "1",
                    "value": "",
                    "key": "INFO.TSD",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Total number of alternate alleles in called genotypes",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AC",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Estimated allele frequency in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Number of samples with data",
                    "number": "1",
                    "value": "",
                    "key": "INFO.NS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Total number of alleles in called genotypes",
                    "number": "1",
                    "value": "",
                    "key": "INFO.AN",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele frequency in the EAS populations calculated from AC and AN, in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.EAS_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele frequency in the EUR populations calculated from AC and AN, in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.EUR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele frequency in the AFR populations calculated from AC and AN, in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AFR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele frequency in the AMR populations calculated from AC and AN, in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.AMR_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele frequency in the SAS populations calculated from AC and AN, in the range (0,1)",
                    "number": "A",
                    "value": "",
                    "key": "INFO.SAS_AF",
                    "type": "Float",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Total read depth; only low coverage data were counted towards the DP, exome data were not used",
                    "number": "1",
                    "value": "",
                    "key": "INFO.DP",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Ancestral Allele. Format: AA|REF|ALT|IndelType. AA: Ancestral allele, REF:Reference Allele, ALT:Alternate Allele, IndelType:Type of Indel (REF, ALT and IndelType are only defined for indels)",
                    "number": "1",
                    "value": "",
                    "key": "INFO.AA",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "indicates what type of variant the line represents",
                    "number": ".",
                    "value": "",
                    "key": "INFO.VT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "indicates whether a variant is within the exon pull down target boundaries",
                    "number": "0",
                    "value": "",
                    "key": "INFO.EX_TARGET",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "indicates whether a site is multi-allelic",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MULTI_ALLELIC",
                    "type": "Flag",
                    "id": ""
                }
            ]
        },
        {
            "referenceSetId": "",
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
                    "description": "dbSNP ID (i.e. rs number)",
                    "number": "1",
                    "value": "",
                    "key": "INFO.RS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Chr position reported in dbSNP",
                    "number": "1",
                    "value": "",
                    "key": "INFO.RSPOS",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "RS orientation is reversed",
                    "number": "0",
                    "value": "",
                    "key": "INFO.RV",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variation Property.  Documentation is at ftp://ftp.ncbi.nlm.nih.gov/snp/specs/dbSNP_BitField_latest.pdf",
                    "number": "1",
                    "value": "",
                    "key": "INFO.VP",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Pairs each of gene symbol:gene id.  The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|)",
                    "number": "1",
                    "value": "",
                    "key": "INFO.GENEINFO",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "First dbSNP Build for RS",
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
                    "description": "Variant Suspect Reason Codes (may be more than one value added together) 0 - unspecified, 1 - Paralog, 2 - byEST, 4 - oldAlign, 8 - Para_EST, 16 - 1kg_failed, 1024 - other",
                    "number": "1",
                    "value": "",
                    "key": "INFO.SSR",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Weight, 00 - unmapped, 1 - weight 1, 2 - weight 2, 3 - weight 3 or more",
                    "number": "1",
                    "value": "",
                    "key": "INFO.WGT",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variation Class",
                    "number": "1",
                    "value": "",
                    "key": "INFO.VC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant is Precious(Clinical,Pubmed Cited)",
                    "number": "0",
                    "value": "",
                    "key": "INFO.PM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Provisional Third Party Annotation(TPA) (currently rs from PHARMGKB who will give phenotype data)",
                    "number": "0",
                    "value": "",
                    "key": "INFO.TPA",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Links exist to PubMed Central article",
                    "number": "0",
                    "value": "",
                    "key": "INFO.PMC",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has 3D structure - SNP3D table",
                    "number": "0",
                    "value": "",
                    "key": "INFO.S3D",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has SubmitterLinkOut - From SNP->SubSNP->Batch.link_out",
                    "number": "0",
                    "value": "",
                    "key": "INFO.SLO",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has non-synonymous frameshift A coding region variation where one allele in the set changes all downstream amino acids. FxnClass = 44",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSF",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has non-synonymous missense A coding region variation where one allele in the set changes protein peptide. FxnClass = 42",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has non-synonymous nonsense A coding region variation where one allele in the set changes to STOP codon (TER). FxnClass = 41",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NSN",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has reference A coding region variation where one allele in the set is identical to the reference sequence. FxnCode = 8",
                    "number": "0",
                    "value": "",
                    "key": "INFO.REF",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has synonymous A coding region variation where one allele in the set does not change the encoded amino acid. FxnCode = 3",
                    "number": "0",
                    "value": "",
                    "key": "INFO.SYN",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In 3' UTR Location is in an untranslated region (UTR). FxnCode = 53",
                    "number": "0",
                    "value": "",
                    "key": "INFO.U3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In 5' UTR Location is in an untranslated region (UTR). FxnCode = 55",
                    "number": "0",
                    "value": "",
                    "key": "INFO.U5",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In acceptor splice site FxnCode = 73",
                    "number": "0",
                    "value": "",
                    "key": "INFO.ASS",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In donor splice-site FxnCode = 75",
                    "number": "0",
                    "value": "",
                    "key": "INFO.DSS",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In Intron FxnCode = 6",
                    "number": "0",
                    "value": "",
                    "key": "INFO.INT",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In 3' gene region FxnCode = 13",
                    "number": "0",
                    "value": "",
                    "key": "INFO.R3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "In 5' gene region FxnCode = 15",
                    "number": "0",
                    "value": "",
                    "key": "INFO.R5",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has other variant with exactly the same set of mapped positions on NCBI refernce assembly.",
                    "number": "0",
                    "value": "",
                    "key": "INFO.OTH",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has Assembly conflict. This is for weight 1 and 2 variant that maps to different chromosomes on different assemblies.",
                    "number": "0",
                    "value": "",
                    "key": "INFO.CFL",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Is Assembly specific. This is set if the variant only maps to one assembly",
                    "number": "0",
                    "value": "",
                    "key": "INFO.ASP",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Is mutation (journal citation, explicit fact): a low frequency variation that is cited in journal and other reputable sources",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MUT",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Is Validated.  This bit is set if the variant has 2+ minor allele count based on frequency or genotype data.",
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
                    "description": "Marker is on high density genotyping kit (50K density or greater).  The variant may have phenotype associations present in dbGaP.",
                    "number": "0",
                    "value": "",
                    "key": "INFO.HD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Genotypes available. The variant has individual genotype (in SubInd table).",
                    "number": "0",
                    "value": "",
                    "key": "INFO.GNO",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "1000 Genome phase 1 (incl. June Interim phase 1)",
                    "number": "0",
                    "value": "",
                    "key": "INFO.KGPhase1",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "1000 Genome phase 3",
                    "number": "0",
                    "value": "",
                    "key": "INFO.KGPhase3",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variation is interrogated in a clinical diagnostic assay",
                    "number": "0",
                    "value": "",
                    "key": "INFO.CDA",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Submitted from a locus-specific database",
                    "number": "0",
                    "value": "",
                    "key": "INFO.LSD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Microattribution/third-party annotation(TPA:GWAS,PAGE)",
                    "number": "0",
                    "value": "",
                    "key": "INFO.MTP",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Has OMIM/OMIA",
                    "number": "0",
                    "value": "",
                    "key": "INFO.OM",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Contig allele not present in variant allele list. The reference sequence allele at the mapped position is not present in the variant allele list, adjusted for orientation.",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NOC",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Is Withdrawn by submitter If one member ss is withdrawn by submitter, then this bit is set.  If all member ss' are withdrawn, then the rs is deleted to SNPHistory",
                    "number": "0",
                    "value": "",
                    "key": "INFO.WTD",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Rs cluster has non-overlapping allele sets. True when rs set has more than 2 alleles from different submissions and these sets share no alleles in common.",
                    "number": "0",
                    "value": "",
                    "key": "INFO.NOV",
                    "type": "Flag",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "An ordered, comma delimited list of allele frequencies based on 1000Genomes, starting with the reference allele followed by alternate alleles as ordered in the ALT column. Where a 1000Genomes alternate allele is not in the dbSNPs alternate allele set, the allele is added to the ALT column.  The minor allele is the second largest value in the list, and was previuosly reported in VCF as the GMAF.  This is the GMAF reported on the RefSNP and EntrezSNP pages and VariationReporter",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CAF",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "RS is a common SNP.  A common SNP is one that has at least one 1000Genomes population with a minor allele of frequency >= 1% and for which 2 or more founders contribute to that minor allele frequency.",
                    "number": "1",
                    "value": "",
                    "key": "INFO.COMMON",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant names from HGVS.    The order of these variants corresponds to the order of the info in the other clinical  INFO tags.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNHGVS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant alleles from REF or ALT columns.  0 is REF, 1 is the first ALT allele, etc.  This is used to match alleles with other corresponding clinical (CLN) INFO tags.  A value of -1 indicates that no allele was found to match a corresponding HGVS allele name.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNALLE",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant Clinical Chanels",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNSRC",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Allele Origin. One or more of the following values may be added: 0 - unknown; 1 - germline; 2 - somatic; 4 - inherited; 8 - paternal; 16 - maternal; 32 - de-novo; 64 - biparental; 128 - uniparental; 256 - not-tested; 512 - tested-inconclusive; 1073741824 - other",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNORIGIN",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant Clinical Channel IDs",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNSRCID",
                    "type": "String",
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
                },
                {
                    "info": {},
                    "description": "Variant disease database name",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNDSDB",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant disease database ID",
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
                    "description": "ClinVar Review Status, mult - Classified by multiple submitters, single - Classified by single submitter, not - Not classified by submitter, exp - Reviewed by expert panel, prof - Reviewed by professional society",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNREVSTAT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variant Accession and Versions",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CLNACC",
                    "type": "String",
                    "id": ""
                }
            ]
        },
        {
            "referenceSetId": "",
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
                    "description": "Data from LOVD Format: EFFECT|DNA_CHANGE|DNA_CHANGE_GENOMIC|PROTEIN_CHANGE|PUBLISHED_AS|DB_ID|VIP|VARIANT_REMARKS|REFERENCE|DBSNP_ID|GENETIC_ORIGIN|SEGREGATION|FREQUENCY|RE_SITE|METHYLATION|OWNER",
                    "number": ".",
                    "value": "",
                    "key": "INFO.LOVD",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Consequence annotations from Ensembl VEP. Format: Allele|Consequence|IMPACT|SYMBOL|Gene|Feature_type|Feature|BIOTYPE|EXON|INTRON|HGVSc|HGVSp|cDNA_position|CDS_position|Protein_position|Amino_acids|Codons|Existing_variation|DISTANCE|STRAND|SYMBOL_SOURCE|HGNC_ID|CANONICAL|TSL|CCDS|ENSP|SWISSPROT|TREMBL|UNIPARC|SIFT|PolyPhen|DOMAINS|GMAF|AFR_MAF|AMR_MAF|ASN_MAF|EAS_MAF|EUR_MAF|SAS_MAF|AA_MAF|EA_MAF|CLIN_SIG|SOMATIC|PUBMED|MOTIF_NAME|MOTIF_POS|HIGH_INF_POS|MOTIF_SCORE_CHANGE",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CSQ",
                    "type": "String",
                    "id": ""
                }
            ]
        },
        {
            "referenceSetId": "",
            "id": "umd",
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
                    "description": "Sample specific UMD id. (-1 means null data)",
                    "number": "1",
                    "value": "",
                    "key": "INFO.UMDID",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "cDNA level name of variant in HGVS format.",
                    "number": "1",
                    "value": "",
                    "key": "INFO.cDNAVAR",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "protein level name of variant in HGVS format.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.pVAR",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mutation type: transition mutation (Ts) in which the base change does not change the pyrimidine-purine orientation. Transversion mutation (Tv) in which the purine-pyrimidine orientation is changed to pyrimidine-purine or vice versa.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.MTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variation class: MS (missense), FS (frameshift), IFD (in frame deletion), IFI (in frame insertion, RGT (large rearrangement), NS (non-sens), ins/del (insertion-deletion), PTC (premature termination codon).",
                    "number": ".",
                    "value": "",
                    "key": "INFO.VARCLASS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "The wild-type codon for this variant.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.wtCODON",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "The wild-type amino acid for this variant.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.wtAA",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "The mutant codon for this variant.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mtCODON",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "The mutant amino acid for this variant.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mtAA",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Sequence variation.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mtEVENT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mutation type: transition mutation (Ts) in which the base change does not change the pyrimidine-purine orientation. Transversion mutation (Tv) in which the purine-pyrimidine orientation is changed to pyrimidine-purine or vice versa.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Location of the variant on the known tridimensional structure.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.STRUCT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Highly conserved amino acid or interacting directly with a known partner.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.HCD",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Pyrimidine double.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.pyDOUBLE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "CpG sites are regions of DNA where a cytosine nucleotide occurs next to a guanine nucleotide in the linear sequence of bases along its length. CpG stands for cytosine and guanine separated by a phosphate (-C-phosphate-G-), which links the two nucleosides together in DNA. The CpG notation is used to distinguish a cytosine followed by guanine from a cytosine base paired to a guanine.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CpG",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mutation impact at the mRNA level.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mRNALVL",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mutation on restriction map.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.RSTCTMAP",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Anonymous number of family.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.sampID",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Patient status.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.PATSTATUS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Gender of the sample.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.GENDER",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Transmission of the variant for the sample.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.TRANSMIT",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Age of onset.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.ONSET",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Family type.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.famTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Reference ID. (-1 means null data)",
                    "number": ".",
                    "value": "",
                    "key": "INFO.refID",
                    "type": "Integer",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Documentation of whether the data has already been published.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.REFERENCE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "A list of databases the mutation is already described in.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mutDB",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Method of analysis.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.methANALYSIS",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Splice site type.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.spliceTYPE",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Wild-type sequence.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.wtSEQ",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "CV.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.CV",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Mutant type sequence.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.mutTYPESEQ",
                    "type": "String",
                    "id": ""
                },
                {
                    "info": {},
                    "description": "Variation percent.",
                    "number": ".",
                    "value": "",
                    "key": "INFO.varPERCENT",
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
