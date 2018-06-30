"use strict";
import React from 'react';
import { Button } from 'react-toolbox/lib';
import styles from './ImportPage.module.css';

const style = {
    next: { float: 'right', color: 'rgb(33, 33, 33)' },
    cancel: { float: 'right', marginRight: '20px'},
    buttons: { paddingTop: '20px' }
};

export default class WizardSection extends React.Component {
    render() {
        const { isLast, isFirst, nextEnabled, fileName } = this.props;

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
                    <Button label='Cancel' raised style={style.cancel}
                            onClick={() => console.log("redirect to My hub page")}
                    />
                </div>
            </div>
        );
    }
};
