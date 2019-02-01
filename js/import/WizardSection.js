"use strict";
import React from 'react';
import { Button, Dialog } from 'react-toolbox/lib';
import styles from './ImportPage.module.css';

const style = {
    next: { float: 'right', color: 'rgb(33, 33, 33)', marginLeft: '20px' },
    cancel: { float: 'right', display: 'inline-block'},
    buttons: { paddingTop: '20px' }
};

export default class WizardSection extends React.Component {
    render() {
        const { isLast, isFirst, nextEnabled, onImport,
            fileName, showRetry, showSuccess, showAdvancedNextLabel
        } = this.props;
        const showNext = !isLast && !onImport && !showRetry;
        const showBack = !isFirst && !showSuccess;

        return (
            <div>
                { fileName && <p><b>File to Import: {fileName}</b></p> }

                { this.props.children }
                <div className={styles.wizardButtons}>
                    <Button
                        label='Back'
                        raised
                        style={{visibility: showBack ? 'visible' : 'hidden'}}
                        onClick={this.props.onPreviousPage}
                    />

                    {showNext &&
                        <Button
                            label={'Next'}
                            raised
                            style={style.next}
                            accent={nextEnabled} disabled={!nextEnabled}
                            onClick={this.props.onNextPage}
                        />
                    }

                    {!!onImport &&
                        <Button
                            label='Import'
                            raised style={style.next}
                            accent={nextEnabled}
                            disabled={!nextEnabled}
                            onClick={onImport}
                        />
                    }

                    {showAdvancedNextLabel &&
                        <Button
                            label={'Advanced'}
                            raised
                            style={style.next}
                            disabled={!nextEnabled}
                            onClick={this.props.onNextPage}
                        />
                    }

                    { showRetry && this.renderRetryButtons() }

                    { showSuccess && this.renderSuccessButtons() }

                    { !showSuccess &&
                    <CancelButton onCancelImport={this.props.onCancelImport}/>}
                </div>
            </div>
        );
    }

    renderRetryButtons() {
        return (
            <div className={styles.retryButtons}>
                <Button label='Edit Data Details' raised style={style.next} accent
                    onClick={this.props.onRetryMetadata}
                />
                <Button label='Reload file' raised style={style.retryButton} accent
                    onClick={this.props.onRetryFile}
                />

                { !!this.props.showLoadWithWarnings &&
                    <Button label='Load with warnings' raised style={style.next}
                        accent onClick={this.props.onLoadWithWarnings}
                    />
                }
            </div>
        );
    }

    renderSuccessButtons() {
        return (
            <div className={styles.retryButtons}>
                <Button label='Finish' raised style={style.next} accent
                    onClick={this.props.onFinish}
                />
                <Button label='Load more data' raised style={style.next} accent
                    onClick={this.props.onImportMoreData}
                />
                <Button label='View data' raised style={style.next} accent
                    onClick={this.props.onViewData}
                />
            </div>
        );
    }
};

class CancelButton extends React.Component {
	state = {active: false};

	onToggle = () => {
		this.setState({active: !this.state.active});
    };

	actions = () => {
		return [
			{label: 'No, I want to continue', onClick: this.onToggle, style: {color: '#377937'}},
			{label: 'Yes, cancel import', onClick: this.props.onCancelImport, style: {color: '#c95252'}}];
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
				<Button onClick={this.onToggle} flat style={{backgroundColor: '#f7f7f7'}}>Cancel</Button>
			</div>);
	}
}
