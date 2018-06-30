"use strict";
import React from 'react';
import { Button, Dialog } from 'react-toolbox/lib';
import styles from './ImportPage.module.css';

const style = {
    next: { float: 'right', color: 'rgb(33, 33, 33)' },
    cancel: { float: 'right', marginRight: '20px', display: 'inline-block'},
    buttons: { paddingTop: '20px' }
};

export default class WizardSection extends React.Component {
    render() {
        const { isLast, isFirst, nextEnabled,
            fileName, callback, localHub } = this.props;

        return (
            <div>
                { fileName && <p><b>File to Import: {fileName}</b></p> }

                { this.props.children }
                <div className={styles.wizardButtons}>
                    <Button label='Back' raised style={{visibility: !isFirst ? 'visible' : 'hidden'}}
                        onClick={this.props.onPreviousPage}
                    />

                    {!isLast &&
                        <Button label='Next' raised style={style.next}
                            accent={nextEnabled} disabled={!nextEnabled}
                            onClick={this.props.onNextPage}
                        />
                    }
                    <CancelButton callback={callback} localHub={localHub}/>
                </div>
            </div>
        );
    }
};

class CancelButton extends React.Component {
	state = {active: false};

	onToggle = () => {
		this.setState({active: !this.state.active});
	};

	onReally = () => {
		this.props.callback(['navigate', 'datapages', {host: this.props.localHub}]);
	};

	actions = () => {
		return [
			{label: 'No, I want to continue', onClick: this.onToggle, style: {color: '#377937'}},
			{label: 'Yes, cancel import', onClick: this.onReally, style: {color: '#c95252'}}];
	};

	render() {
        var {active} = this.state;

		return (
			<div style={style.cancel}>
				<Dialog actions={this.actions()} active={active}
						onEscKeyDown={this.onToggle} onOverlayClick={this.onToggle}
						title='Are you sure you want to cancel import process ?'>
					Current progress will be lost
				</Dialog>
				<Button onClick={this.onToggle} flat>Cancel</Button>
			</div>);
	}
}
