var React = require('react');
import Dialog from "react-toolbox/lib/dialog";
import Iframe from "react-iframe";
import PureComponent from '../PureComponent';
import genesetViewerStyle from "./genesetviewer.module.css";

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

export const GENESETS_VIEWER_URL = 'https://xenageneset.berkeleybop.io/xena/#';
// export const GENESETS_VIEWER_URL = 'http://localhost:3000/#';

export class GeneSetViewDialog extends PureComponent {

  render() {

        let {showGeneSetWizard, onHide, geneSetUrl} = this.props;
        const actions = [
            {
            children: [<i className='material-icons'>close</i>],
            className: genesetViewerStyle.mainDialogClose,
            onClick: this.props.onHide
            },
        ];

        return (
            <Dialog
                actions={actions}
                active={showGeneSetWizard}
                className={genesetViewerStyle.mainDialog}
                onEscKeyDown={onHide}
                onOverlayClick={onHide}
                title='Differential Geneset Visualization'
                theme={{
                  dialog: genesetViewerStyle.dialogBase,
                  wrapper: genesetViewerStyle.dialogWrapper,
                }}
                >
                <Iframe url={geneSetUrl}
                    src={geneSetUrl}
                    width="100%"
                    className={genesetViewerStyle.genesetiframe}
                    height="400px"
                    id="myId"
                    display="block"
                    loading='Loading wizard'
                    position="relative"
                />
            </Dialog>
        );
    }
}
