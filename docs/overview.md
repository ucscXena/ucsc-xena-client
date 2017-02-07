# Xena client architecture overview

## Goals

The primary goal of the new frontend architecture vs. the cancer browser is to
simplify the state flow. The cancer browser is a model-view-controller (MVC)
architecture with backbonejs. At a certain level of complexity MVC becomes
difficult to extend or maintain. MVC creates many stateful objects which interact
with each other via bespoke APIs (class or interface methods). The evolution of
state over time in MVC emerges from the cascading state changes of these many
objects: a change in A causes a change in B, which causes a change C, etc.

It is hard to predict the behavior of such a system as a whole. This led to
problems such as needing to exhaustively test all possible combinations of user
actions, since each one caused a different data flow (stack trace). It also
caused performance bottlenecks due to cascading event handlers, which might
modify the DOM many times in response to a single event.

The new architecture borrows from current developments in front-end design which
specifically address these problems. The two main principles are one-way data
flow and single-atom state. Single-atom state means that the application state
is in a single variable, rather than spread across many objects. One-way
data flow means that state evolves via a singluar mechanism, with view
following state (but state not following view).

## Data flow

The application data flow work as follows. There is a single variable holding
a data structure that describes the entire persistent state of the application,
e.g. the height of the plot, the list of columns to display, the datasets they
are displaying, etc. This state is then transformed and passed to the view
layer (react) for rendering to the DOM. The views emit semantic actions
(describing user intent, like "add column", rather than DOM events such as
"clicked button").  A controller module evaluates these events, and computes a
new application state. Optionally, the controller may run side-effects, such as
issuing ajax requests. The new application state is then transformed and passed
to the view layer again.

![state flow](state-flow.png)

Similarly, ajax requests emit semantic actions, which in identical fashion are
used by a controller to update the application state. The handler for an action
has the signature of a reducing function, and the controller is essentially
performing a functional 'reduce' of the actions over the action handlers.

Application state is implemented as an rxjs Observable via the 'scan' operator,
something like

```javascript
var state = actions.scan(initialState, controlRunner)
```

where ```actions``` is a stream (Observable) of actions. 

## Immutable data

In this design, application state must be treated as immutable data. Mutating
state in-place will cause the view to be out of sync with the state.

In practice this means that state should only be changed in an action
handler, and the action handler 'changes' state by returning a new state value.

To make it easy to create a state value, we use an immutability-helper
library that looks a bit like clojure data methods.

https://github.com/ucscxena/ehmutable

### Connectors

The state is passed to the view layer by subscribing to the stream.

```javascript
state.subscribe(state => ReactDOM.render(<Page callback={updater} selector={selector} state={state} />, dom.main)
```

This code is in a 'connector' module, along with other boilerplate for setting up
the initial state, creating callbacks for dispatching actions, and so-forth.

There are two connectors: connector-prod.js for production, and
connector-dev.js for development. The development connector integrates with
redux-dev-tools, allowing debugging of state, and hot reloading of react
components.

## Selectors

We try to avoid duplicating data in the application state through the use of
'selectors', which are just memoized functions of the state. So, for example,
we need an index of the data in order to draw quickly. It is not stored in the
application state. Instead, it is computed in a selector prior to passing the
state to the view layer. Because it is memoized, if the data inputs for the
selector have not changed the cached value can be used.

Note: https://en.wikipedia.org/wiki/Memoization

Our selectors are in appSelector.js, and are composed into a single
selector at the bottom of the file:

```javascript
var selector = state => kmGroups(transform(sort(match(avg(index(state))))));
```

##### index
Computes indexes of column data (by position and by sample) for fast rendering.

##### avg
Computes weighted averages of segmented data which are required in several views.

##### match
Computes samples that match the search terms in the "Samples to highlight" control.

##### sort
Computes the sample sort of the columns, based on column data and column order.

##### transform
Computes column data for the view, e.g. mapping numbers to colors, filtering
data by zoom position, etc.

##### kmGroups
Computes km results from KM settings and column data.


## Actions and Controllers

We represent actions as variants,

https://www.youtube.com/watch?v=ZQkIWWTygio

which we encode as javascript array literals where the first element
is the tag (the action type), and later elements are parameters.  E.g. when the
user edits the column field label we dispatch a 'fieldLabel' action, with
parameters for the column ID, and the new text of the label,

```javascript
['fieldLabel', 'e108343d-f914-4aca-9a46-40533349d671', 'pam50']
```

Controllers dispatch to a particular handler (reducer) function based on the 
tag, like so:

```javascript
(state, [tag, ...args]) => (controls[tag] || identity)(state, ...args)
```

passing to the handler the current state, and the arguments of the action,
where ```controls``` is a mapping of action types to action handlers.

```javascript
var controls = {
	/* 'id' and 'value' correspond to the fieldLabel action parameters, above */
	fieldLabel: (state, id, value) =>
		_.assocIn(state, ['columns', id, 'user', 'fieldLabel'], value),

    /* ...other action handlers follow */
}
```

### Async, and other side effects

If a side-effect (e.g. ajax) should be executed in response to the action, a
handler is declared with the same name, plus the suffix '-post!'.

```javascript
var controls = {
	/* ... */
	'add-column-post!': (serverBus, state, newState, id, settings) =>
		fetchColumnData(serverBus, newState, id, settings);
	/* ... */
}
```

Side-effect handlers are passed a rxjs Subject, 'serverBus', for dispatching
additional actions, the old state, the new state, and the arguments of the
action.

```javascript
(serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
```

Action handlers are organized into two files: controllers/ui.js, for actions
dispatched from the view layer, and controllers/server.js, for actions dispatched
from ajax handlers. Currently this is only organizational: there's no functional
reason for this arrangement, though it might be useful for some debugging
tasks.

A 'callback' property is passed to the view layer for dispatching actions from
react components.

```javascript
this.props.callback(['fieldLabel', id, newText]);
```

## View layer

The view layer is as stateless as possible. The only state in a view (React
component) is transient, such as UX animation effects. Many of these can be
accomplished with css transition or animation, without storing any state in the
view.  Additionally, views should have a minimum of domain knowledge, to make
them more reusable, and to simplify testing. Views are difficult to test, and
are quite complex even without domain knowledge. It's better to keep domain
knowledge in modules of pure functions (functions lacking side effects), which
can be more easily tested.

So, for example, it's better to write a view that operates on an abstract
coordinate space than one that operates on a genomic coordinate space. That
way the view is simpler, and different coordinate spaces can be passed in
(e.g. exon vs. full-genome space; hg18 vs. hg19 space; etc.). A selector is
a good place to translate from domain-specific data to view data.

### Containers

It is sometimes useful to separate view code that dispatches actions
or composes components, from view code that renders. For example, reusing
a rendering component is easier when it knows less about the global state,
and the action handlers. For that reason, we sometimes split components
into those that are purely 'view', and those that are 'containers.'

'View' components should have a minimum of business logic, and should
only interact with the page via handler callbacks, like 'onClick',
'onSelect', 'onAddCohort', etc.

'Container' components should have a minimum of rendering, and should
know how to issue actions in response to event handlers that are
passed to its children.

Here, a container component defines an onReorder handler to be passed
to a view component. The handler dispatches an 'order' action.

```javascript
	onReorder(order) {
		this.props.callback(['order', order]);
	},
```

The callback will be passed in the container's render method.

```javascript
	render() {
		return <Spreadsheet onReorder={this.onReorder}>
	}
```

## Model

To separate view layers from domain knowledge where appropriate, domain
knowledge is capture in 'model' modules. This is a bit different from the idea
of a 'model' in MVC, in that it has no state. A model is a set of pure
functions relevant to some domain, which can be used by the other layers
(selector, controller, view).

This is primarily an organizational technique. The major data types are
represented by models, such as model/denseMatrix.js, model/mutationVector.js,
model/segmented.js.

## State Schema

An incomplete description of the application state is available here:

http://htmlpreview.github.io/?https://github.com/ucscXena/ucsc-xena-client/blob/master/docs/schema.html#Application
