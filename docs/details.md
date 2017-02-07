# Xena client architecture, details

## column polymorphism

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

cmp is a function that will dispatch on the ```fieldType``` property of its
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

Install react developer tools from chrome and FF.

https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

Very roughly, and neglecting bootstrap layout components, our widget hierarchy
looks like this.

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

### ColumnEdit2

Implements the pop-up for adding data (via the "+ Data" button).
