import Iframe from "react-iframe";

var React = require('react');
import Dialog from "react-toolbox/lib/dialog";
import PureComponent from '../PureComponent';

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
