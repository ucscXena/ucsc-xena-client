import Iframe from "react-iframe";

var React = require('react');
import Dialog from "react-toolbox/lib/dialog";
import PureComponent from '../PureComponent';

export class GeneSetViewDialog extends PureComponent {
    // componentDidMount() {
    //     document.documentElement.scrollTop = 0;
    //     var body = document.getElementById("body");
    //     body.style.overflow = "auto";
    // }
    actions = [
        { label: "Cancel", onClick: this.props.onHide },
    ];

    render() {

        let {showGeneSetWizard, onHide, geneSetUrl} = this.props;

        // const actions = [
        //     {
        //         children: [<i className='material-icons'>close</i>],
        //         className: kmStyle.warningDialogClose,
        //         onClick: this.props.onHide
        //     },
        // ];

        return (
            <Dialog
                actions={this.actions}
                active={showGeneSetWizard}
                onEscKeyDown={onHide}
                onOverlayClick={onHide}
                // theme={{
                //     wrapper: kmStyle.dialogWrapper,
                //     overlay: kmStyle.dialogOverlay}}>
                >
                <h3>Gene Set Comparison Wizard</h3>
                <hr/>
                <Iframe url={geneSetUrl}
                    src={geneSetUrl}
                    width="100%"
                    height="100%"
                    id="myId"
                    display="block"
                    loading='Loading wizard'
                    position="relative"
                />
                {/*{this.props.body}*/}
            </Dialog>
        );
    }
}
// GeneSetViewDialog.propTypes = {
//     geneSetUrl: PropTypes.string.isRequired,
//     onHide: PropTypes.any.isRequired,
//     showGeneSetWizard: PropTypes.boolean.isRequired,
// }
