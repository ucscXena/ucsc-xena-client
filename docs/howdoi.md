# UCSC Xena Client How To

## How do I add a new UI action?

A new action might be necessary if a UI control is added or changed,
and no existing actions are suitable for updating the application state.

There are typically three parts to adding a new action: writing the action handler,
writing an event handler to dispatch the action, and passing the event handler
down to the UI component.

As a trivial example, consider a column control that rewrites the field label
in upper case. In practice, we would just use the existing 'fieldLabel' action,
and pass in the new value. But, as an exercise, here's how you would do it as
a separate action.

### Writing a UI action handler

We'll name the action 'fieldLabelToUpper'. As parameter we will require
the column ID, so we know which column to update.

```javascript
['fieldLabelToUpper', id]
```

In controllers/ui.js, add a key to the ```controls``` object, with a function that
will return a new state value.  In the application state, the value that needs
to be updated is ```state.columns[id].fieldLabel.user``` (which holds the
user setting of the field label). We use the ehmutable ```updateIn``` method
to evaluate a function of the current value at the desired path in the state tree.


```javascript
	fieldLabelToUpper: (state, id) =>
		_.updateIn(state, ['columns', id, 'fieldLabel', 'user'], s => s.toUpperCase()),
```

If this isn't clear, review the docs for ehmutable, and try logging the values
on the console, like so:

```javascript
	fieldLabelToUpper: (state, id) =>
		spy('new state', _.updateIn(_.spy('old state', state), ['columns', id, 'fieldLabel', 'user'], s => s.toUpperCase())),
```

See [Debug strategies](details.md#Debugging)

### Writing an event handler to dispatch the action

Column control events are handled in the SpreadsheetContainer component, which
passes event handlers down to the dumb 'view' components.  SpreadsheetContainer
is implemented as a high-order component, meaning it's created by calling
a function, ```getSpreadsheetContainer```, with components as arguments. This
isn't important for implementing the event handler, except that we need to
know that ```getSpreadsheetContainer``` has the code we're interested in.

We will add the following method.

```javascript
	onFieldLabelToUpper (id) {
		this.props.callback(['fieldLabelToUpper', id]);
	}
	/* ... */
```

### Passing the event handler to the UI component.

Presumably, we want this event to be fired from a menu item in the
Column, so we need to pass the event handler to Column. Still
in ```getSpreadsheetContainer```, update the render method to pass the
event handler.


```jsx
	<Column
		onFieldLabelToUpper={this.onFieldLabelToUpper}
		onViz={this.onOpenVizSettings}
		onFieldLabel={this.onFieldLabel}
		... />
```

Finally, in Column.js, render the menu item, and invoke the event handler
with the column id.

```jsx
	<MenuItem onSelect={() => this.props.onFieldLabelToUpper(id)}To Upper</MenuItem>
	<MenuItem onSelect={this.onDownload}>Download</MenuItem>
	{aboutDatasetMenu(datasetMeta(id))}
	<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
```

To keep the style consistent with the existing code, you might instead want
to write a new method in the Column component that fills in the id.

```javascript
	onFieldLabelToUpper: function () {
		this.props.onFieldLabelToUpper(this.props.id);
	},
```

and invoke this method from the MenuItem.

```jsx
	<MenuItem onSelect={this.onFieldLabelToUpper}To Upper</MenuItem>
	<MenuItem onSelect={this.onDownload}>Download</MenuItem>
	{aboutDatasetMenu(datasetMeta(id))}
	<MenuItem onSelect={this.onViz}>Viz Settings</MenuItem>
```

This avoids creating a new closure on every render for the onSelect handler.
