import Iframe from "react-iframe";

var React = require('react');
import Dialog from "react-toolbox/lib/dialog";
import PureComponent from '../PureComponent';

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

export class GeneSetViewDialog extends PureComponent {
    actions = [
        { label: "Close", onClick: this.props.onHide },
    ];

    render() {

        let {showGeneSetWizard, onHide, geneSetUrl} = this.props;

        return (
            <Dialog
                actions={this.actions}
                active={showGeneSetWizard}
                onEscKeyDown={onHide}
                onOverlayClick={onHide}
                type='large'
                >
                <h3>Differential Geneset Visualization</h3>
                <hr/>
                <Iframe url={geneSetUrl}
                    src={geneSetUrl}
                    width="700px"
                    height="500px"
                    id="myId"
                    display="block"
                    loading='Loading wizard'
                    position="relative"
                />
            </Dialog>
        );
    }
}
