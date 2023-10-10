var React = require('react');
import {Box, Dialog, DialogContent, DialogTitle, Icon, IconButton, Typography} from '@material-ui/core';
import Iframe from "react-iframe";
import PureComponent from '../PureComponent';
import {xenaColor} from '../xenaColor';

// Styles
import genesetViewerStyle from './genesetviewer.module.css';
var sxCloseButton = {
    alignSelf: 'flex-start',
    color: xenaColor.BLACK_38,
    '&:hover': {
        backgroundColor: xenaColor.BLACK_6,
    },
};

export const AVAILABLE_GENESET_COHORTS = [
  "TCGA Liver Cancer (LIHC)",
  "TCGA Cervical Cancer (CESC)",
  "TCGA Sarcoma (SARC)",
  "TCGA Thymoma (THYM)",
  "TCGA Mesothelioma (MESO)",
  "TCGA Pancreatic Cancer (PAAD)",
  "TCGA Ocular melanomas (UVM)",
  "TCGA Rectal Cancer (READ)",
  "TCGA Lung Squamous Cell Carcinoma (LUSC)",
  "TCGA Stomach Cancer (STAD)",
  "TCGA Colon Cancer (COAD)",
  "TCGA Lower Grade Glioma (LGG)",
  "TCGA Thyroid Cancer (THCA)",
  "TCGA Kidney Chromophobe (KICH)",
  "TCGA Kidney Papillary Cell Carcinoma (KIRP)",
  "TCGA Bile Duct Cancer (CHOL)",
  "TCGA Glioblastoma (GBM)",
  "TCGA Lung Adenocarcinoma (LUAD)",
  "TCGA Ovarian Cancer (OV)",
  "TCGA Kidney Clear Cell Carcinoma (KIRC)",
  "TCGA Endometrioid Cancer (UCEC)",
  "TCGA Head and Neck Cancer (HNSC)",
  "TCGA Adrenocortical Cancer (ACC)",
  "TCGA Prostate Cancer (PRAD)",
  "TCGA Uterine Carcinosarcoma (UCS)",
  "TCGA Melanoma (SKCM)",
  "TCGA Pheochromocytoma & Paraganglioma (PCPG)",
  "TCGA Breast Cancer (BRCA)",
  "TCGA Testicular Cancer (TGCT)",
  "TCGA Acute Myeloid Leukemia (LAML)",
  "TCGA Large B-cell Lymphoma (DLBC)",
  "TCGA Bladder Cancer (BLCA)",
  "TCGA Esophageal Cancer (ESCA)",
  "Cancer Cell Line Encyclopedia (Breast)"
];

export const GENESETS_VIEWER_URL = 'https://xenagoweb.xenahubs.net/xena/#';

export class GeneSetViewDialog extends PureComponent {

  render() {

        let {showGeneSetWizard, onHide, geneSetUrl} = this.props;

        return (
            <Dialog
                BackdropProps={{style: {top: 64}}}
                className={genesetViewerStyle.mainDialog}
                fullWidth
                maxWidth={'sm'}
                onClose={onHide}
                open={showGeneSetWizard}
                PaperProps={{style: {alignSelf: 'flex-start'}}}>
                <DialogTitle disableTypography>
                    <Box sx={{display: 'flex', gap: 8, justifyContent: 'space-between'}}>
                        <Typography variant='subtitle1'>Differential Geneset Visualization</Typography>
                        <Box color='default' component={IconButton} onClick={onHide} sx={sxCloseButton}>
                            <Icon>close</Icon>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Iframe url={geneSetUrl}
                            src={geneSetUrl}
                            width="100%"
                            height="350px"
                            id="myId"
                            display="block"
                            loading='Loading wizard'
                            position="relative"
                    />
                </DialogContent>
            </Dialog>
        );
    }
}
