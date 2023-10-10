import {
	Box,
	Button,
	CardActions,
	CardContent,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider, Typography
} from '@material-ui/core';
import React from 'react';

export default class WizardSection extends React.Component {
    render() {
        const { isLast, isFirst, nextEnabled, onImport,
            fileName, showRetry, showSuccess, showAdvancedNextLabel
        } = this.props;
        const showNext = !isLast && !onImport && !showRetry;
        const showBack = !isFirst && !showSuccess;

		return (
			<>
				<CardContent>
					<Box position='relative'>
						{fileName && <Box component={Typography} mt={0} variant='h4'><strong>File to Import: {fileName}</strong></Box>}
						{this.props.children}
					</Box>
				</CardContent>
				<Divider/>
				<CardActions>
					{showBack && <Box flex={1}><Button color='default' onClick={this.props.onPreviousPage}>Back</Button></Box>}
					{!showSuccess && <CancelButton onCancelImport={this.props.onCancelImport}/>}
					{showNext && <Button disabled={!nextEnabled} onClick={this.props.onNextPage}>Next</Button>}
					{showAdvancedNextLabel && <Button color='default' disabled={!nextEnabled} onClick={this.props.onNextPage}>Advanced</Button>}
					{!!onImport && <Button disabled={!nextEnabled} onClick={onImport}>Import</Button>}
					{showRetry && this.renderRetryButtons()}
					{showSuccess && this.renderSuccessButtons()}
				</CardActions>
			</>
		);
	}

	renderRetryButtons() {
		return (
			<>
				<Button onClick={this.props.onRetryFile}>Reload file</Button>
				{!!this.props.showLoadWithWarnings && <Button onClick={this.props.onLoadWithWarnings}>Load with warnings</Button>}
				<Button onClick={this.props.onRetryMetadata}>Edit Data Details</Button>
			</>
		);
	}

	renderSuccessButtons() {
		return (
			<>
				<Button onClick={this.props.onViewData}>View data</Button>
				<Button onClick={this.props.onImportMoreData}>Load more data</Button>
				<Button onClick={this.props.onFinish}>Finish</Button>
			</>
		);
	}
};

class CancelButton extends React.Component {
	state = {active: false};

	onToggle = () => {
		this.setState({active: !this.state.active});
	};

	render() {
		var {active} = this.state;

		return (
			<>
				<Dialog maxWidth={false} onClose={this.onToggle} open={active}>
					<DialogTitle disableTypography><h2>Are you sure you want to cancel import process?</h2></DialogTitle>
					<DialogContent>
						<DialogContentText>Current progress will be lost</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Box sx={{color: '#377937'}}><Button color='inherit' onClick={this.onToggle}>No, I want to continue</Button></Box>
						<Box sx={{color: '#c95252'}}><Button color='inherit' onClick={this.props.onCancelImport}>Yes, cancel import</Button></Box>
					</DialogActions>
				</Dialog>
				<Button color='default' onClick={this.onToggle}>Cancel</Button>
			</>);
	}
}
