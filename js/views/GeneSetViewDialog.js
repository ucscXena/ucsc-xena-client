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

    render() {

        let {showGeneSetWizard, onHide, geneSetUrl} = this.props;

        // const actions = [
        //     {
        //         children: [<i className='material-icons'>close</i>],
        //         className: kmStyle.warningDialogClose,
        //         onClick: this.props.onHide
        //     },
        // ];
        console.log('loading', this.props);

        return (
            <Dialog
                active={showGeneSetWizard}
                onEscKeyDown={onHide}
                onOverlayClick={onHide}
                // theme={{
                //     wrapper: kmStyle.dialogWrapper,
                //     overlay: kmStyle.dialogOverlay}}>
                >
                Cats:
                <Iframe url={geneSetUrl}
                    src={geneSetUrl}
                    width="450px"
                    height="450px"
                    id="myId"
                    display="block"
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
