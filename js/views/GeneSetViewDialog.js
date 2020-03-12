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
                >
                <h3>Gene Set Comparison Wizard</h3>
                <hr/>
                <Iframe url={geneSetUrl}
                    src={geneSetUrl}
                    width="100%"
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
