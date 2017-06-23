'use strict';

var React = require('react');
const GeneSuggest = require('../views/GeneSuggest');

var GeneInput = React.createClass({
  getInitialState: function() {
    return {inputValue: ""};
  },

  render: function() {
    return (
      <div>
        <GeneSuggest value={this.state.inputValue}
                    onChange={value => {
                      this.setState({inputValue: value});
                      this.props.geneSelect(value);
                  }}/>
      </div>
    );
  }

});

module.exports = GeneInput;
