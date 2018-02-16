# Xena client architecture, details

## Debugging

Debugging this architecture can require some new techniques, if you haven't
seen it before. DOM updates happen outside the application code, in the
React library. Most functions are composed entirely of expressions, with
few temporary variables that you can log to console. The state flow in
rx Observables is less accessible.

Here are some techniques that will help.

Of course, the usual methods (chrome dev tools, ```debugger```
statement, ```console.log```) are still available.

### react developer tools

https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

React developer tools is a plugin for chrome and firefox which extends
the debugger. It adds a new 'React' tab, which allows you to inspect the
state of the react library, including the component hierarchy, and
the ```props``` and ```state``` of each component.

Note, particularly, that if you select an element in the 'Elements' tab,
then switch to the React tab, the component containing the selected element
will be selected. Also, having selected a component, the variable ```$r``` in
the console will be the selected component.

### redux dev tools

https://github.com/gaearon/redux-devtools

Redux dev tools is available in the development build (```npm start```). Click
on the page and hit ctrl-h to show or hide the tool.

This tool allows you to
inspect actions, and the application state after each iteration of the
controller. The complete history of the application is recorded, and can
be replayed from the tool by selecting or omitting individual actions. 
This is particularly useful for debugging action handlers, and the view layer.

The dev connector will keep the history across page reloads, if it small enough
to fit in sessionStorage. Use the 'commit' button to discard history that you
no longer care about.

### spy(msg, x)

Since most of our functions are pure, composed entirely of expressions, there
are few local variables or object members that can be inspected in the debugger
or logged to console. A common problem, then, is how to inspect the values in
a nested expression. 

```javascript
	return f(g(x));
```

You could rewrite the expression with temporary variables.

```javascript
	var gret = g(x);
	var fret = f(gret);
	console.log(x, fret, gret);
	return fret;
```

But this is laborious and error-prone. Until the debuggers improve, a workaround
is to use the ```spy``` method in underscore_ext.js. ```spy(msg, x)``` will
log ```msg``` and ```x```, and return value ```x```. So, you can insert it into
expressions without disrupting the structure.

```javascript
	return f(_.spy('g', g(x)));
```

### rxjs spy(msg)

Similarly, rxjs allows writing expressions over observable streams. If
the stream is not behaving as expected, adding console logs by hand is
error-prone and complicated. There is a ```spy``` helper operator in rx.ext.js
which logs all events on the stream: error, next, complete, and dispose.

Given an rx expression like the following,

```javascript
	var stream = inputs.groupby(x => x.foo).concat(other).filter(x =>x).subscribe(doit);
```

drop the ```spy``` method after any operator to get a console log of that stream.

```javascript
	var stream = inputs.spy('input').groupby(x => x.foo).spy('group by').concat(other).filter(x =>x).subscribe(doit);
```

### babel-node

It is often helpful to run small code examples outside of the application. Our
project uses babel to compile javascript es6, which means node can't directly
read our modules. Instead, use babel-node.

Note that node has problems with the variable name '_', so use something else.
Also, any code that references DOM variables (```window```, ```document```) will
exit with an error.

```
(master) ~/ucsc-xena-client> babel-node
> var u = require('./js/underscore_ext')
'use strict'
> var y = u.curry((x, y) => x + y)
'use strict'
> y(1)(2)
3
> y(1, 2)
3
```

## Column polymorphism

The xena display is composed of a number of heterogenous data columns. For example,
one might display a copy number column (which is a two-dimensional array of floats),
and a mutation column (a sparse array describing variants in genomic space). The
are several methods which are polymorphic on the type of the column, such
as comparing two samples for sorting rows, and transforming the column data for
the view layer.

Instead of a class hierarchy to handle this polymorphism, we use an ad hoc
polymorphic dispatch, based on the passed parameters of the function. This is
roughly a multimethod, and works as follows.

A polymorphic function is created by calling ```multi(f)```, where f returns
the value to be used for dispatch.

```javascript
var cmp = multi(x => x.fieldType)
```

In this example, cmp is a function that will dispatch on the ```fieldType``` property of its
first parameter. When first declared, there are no concrete implementations of
the method, so it will throw a 'No method' error for all inputs. To add an
implementation for a specific fieldType, call ```cmp.add```.

```javascript
cmp.add('mutation', mutationVector.cmp);
```

Now 'cmp' has one concrete implemenation, for objects with fieldType 'mutation',
e.g.

```javascript
var highLowOrEqual = cmp({fieldType: 'mutation', ...otherProps}, sample0, sample1)
```

Passing any other fieldType will still throw an error. The mutationVector,
denseMatrix, and segmented models implement the multimethods for their respective
domains.

## Widget hierarchy

Install react developer tools for chrome and FF.

https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

Very roughly, our widget hierarchy looks like this.

```
<ApplicationContainer>
  <Application>
	<AppControls>
	<SampleSearch>
	<SpreadsheetContainer>
		<Spreadsheet>
			<YAxisLabel>
			<Columns>
				<Column>
					<HeatmapColumn>
				</Column>
				<Column>
					<HeatmapColumn>
				</Column>
				<Column>
					<MutationColumn>
				</Column>
				<Button>+ Data</Button>
				<ColumnEdit2>
```
### ApplicationContainer

Top-level container that executes the state selector (appSelector.js),
dispatches a number of actions for the 'dumb' components, selects the view mode
(spreadsheet or chart), and parameterizes the Spreadsheet component (useful for
embedding in other web sites).

### Application

Lays out the basic page, with the main controls (AppControls) at the top,
the search bar, and the spreadsheet (or chart).

### AppControls

Basic form with controls for cohort, mode etc.

### SampleSearch

Basic form with controls for the sample search.

### SpreadsheetContainer

Container that dispatches most actions for the 'dumb' column components,
and instantiates both the Spreadsheet and the Column components.

### Spreadsheet

Lays out the YAxisLabel and Columns component.

### Columns

Columns provides various features on the columns as a whole. There's a pretty
subtle complexity here, where different features are added to Columns through a
sequence of high-order components. This allows a la carte composition of
features of the Columns component, which is important for embedding in other
web sites.

The set of features is determined in ApplicationContainer, like so:

```javascript
var columnsWrapper = c => addTooltip(makeSortable(disableSelect(addColumnAddButton(addVizEditor(c)))));
```

```addTooltip``` enables tooltip on the columns. ```makeSortable``` enables the drag-column-to-sort
behavior. ```disableSelect``` is a hack to prevent browser text selection highlighting of
graphical elements. ```addColumnAddButton``` appends the "+ Data" button.
```addVizEditor ``` adds a pop-up for manipulating column rendering options.

### Column

Provides the controls at the top of each column, resize handle, legend, etc.

### HeatmapColumn, MutationColumn, etc.

Renders canvas, polymorphically, for the various data types. These are
implement in plotDenseMatrix.js, plotMutationVector.js, and plotSegmented.js.
