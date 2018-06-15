"use strict";
import React from 'react';
import { Button } from 'react-toolbox/lib';

const styles = {
    right: { float: 'right' },
    buttons: { paddingTop: '20px' }
};

export default class WizardSection extends React.Component {
    render() {
        const { isLast, isFirst } = this.props;

        return (
            <div>
                { this.props.children }
                <div style={styles.buttons}>
                    <Button label='Previous step' raised style={{visibility: !isFirst ? 'visible' : 'hidden'}}
                        onClick={this.props.onPreviousPage}
                    />
                    {!isLast &&
                        <Button label='Next step' raised style={styles.right}
                            onClick={this.props.onNextPage}
                        />
                    }
                </div>
            </div>
        );
    }
};
