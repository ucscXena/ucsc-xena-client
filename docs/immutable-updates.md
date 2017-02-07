# Xena client, updates to immutable state

State is updated by creating a new state value, and passing
that new value to the view layer via a selector.

Refer to this diagram for the following discussion.

![state flow](state-flow.png)

The selector and view functions can be expensive to compute. For
that reason we want to cache what values we can, and recompute only the
things we need, or can afford, to recompute.

We do this by memoization: remembering the previous input, and previous
result of the selector or view. If the current input is the same as the
previous input, we can return the previous result without recomputing.

This works because 1) the selector is composed of smaller selectors, each of
which caches only the subset of the state that affects it, 2) the view is
composed of smaller view components, each of which caches the subset of
the state that affects it, and 3) we create new state values by reusing
values of the previous state.

## Composing memoized selectors

Suppose our initial state looks like this

<pre>
var state0 = {
	user: {first: "Kathy", last: "Smith"},
	post: {headline: "Ouch", date: "11/12/2016"}
}
</pre>

Our view will render this in two components, one for 'user' and one
for 'post'. Each view requires that the state be transformed with
a selector. At the top, we will have an Application component that
runs the selector and renders subcomponents

```jsx
var Application = React.createClass({
	mixins: [deepPureRenderMixin],
	render() {
		var selectedState = selector(this.props.state);
		return (
			<div>
				<User name={selectedState.name} />
				<Post header={selectedState.header} />
			</div>
		);
	}
});
```

The selector will create an object in the following shape.

<pre>
var selectedState0 = {
	name: "Kathy Smith",
	header: "Ouch: 11/12/2016"
};
</pre>

On the next action, we will generate the next state by modifying the 'user'
element.

```javascript
var state1 = _.assocIn(state0, ['user', 'last'], 'Jones');
```

This gives us a new state. Changed references are in red.

<pre>
var <b style='color:red'>state1</b> = {
	<b style='color:red'>user</b>: {first: "Kathy", <b style='color:red'>last</b>: "Jones"},
	post: {headline: "Ouch", date: "11/12/2016"}
};
</pre>

This again gets passed to the selector, and the view components. We don't want
to recompute the value for ```selectedState0.header```, and we don't want to
re-render the ```Post``` component. Instead, we want the selector to only
recompute ```name```, and we want ```Application``` to only re-render ```User```.

So, we decompose the selector into caching sub-selectors. ```createSelector```
creates a memoized selector function. The last parameter is a pure function to
be memoized. The leading parameters are functions that return the inputs
to the memoized function. (In practice we would never memoize functions this
trivial, because it's faster and simpler to recompute them. Pretend that they
are terribly expensive.)


```javascript
var nameSelector = createSelector(
	state => state.user,
	user => `${user.first} ${user.last}`);

var headerSelector = createSelector(
	state => state.post,
	post => `${post.headline}: ${post.date}`);

var selector = state => ({
	name: nameSelector(state),
	header: headerSelector(state)
});
```

Now, when we call ```selector(state1)```, we get the following structure.
Changed references are in red.

<pre>
var <b style='color:red'>selectedState1</b> = {
	<b style='color:red'>name</b>: "Kathy Jones",
	header: "Ouch: 11/12/2016"
};
</pre>

 ```selector``` has called ```nameSelector```, which returned a new value. It has
called ```headerSelector```, which has returned a cached value, because
 ```state1.post``` is the same as ```state0.post```.


## Composing components

The selected state is now passed to the subcomponents of ```Application```.

```jsx
return (
	<div>
		<User name={selectedState.name} />
		<Post header={selectedState.header} />
	</div>
);
```

The ```props``` for ```User```, ```{name: "Kathy Jones"}```, has changed. This
causes ```User``` to re-render. On the other hand, the ```props```
for ```Post```, ```{header: "Ouch: 11/12/2016"}``` has not changed. It will
not re-render.

Note that if we had not used subcomponents, and had instead rendered ```name```
and ```header``` directly in ```Application```, this optimization would not happen.
 ```Application``` would alway re-render everything, because its ```props``` will
change on every state change.

Similarly, if ```Application``` had called a subcomponent that rendered both
 ```name``` and ```header```, we would not be able to just re-render ```name```,
or just re-render ```header```. We decompose into subcomponents when we want
to be able to independently avoid re-render of parts of the component.

## Reusing values of the previous state

We could achieve these optimizations, avoiding selector recompute, and avoiding
view recompute, by doing a deep copy of the state structure. But that would
be ineffecient for two reasons: the copy itself is expensive, and the time
to deep compare it is expensive.

Suppose we have a deep-copy algorithm ```clone```. We could create ```state1```
as follows.

```javascript
var state1 = clone(state0);
state1.user.last = "Jones";
```

This gives us a new state structure, changed references in red:

<pre>
var <b style='color:red'>state1</b> = {
	<b style='color:red'>user</b>: {first: "Kathy", <b style='color:red'>last</b>: "Jones"},
	<b style='color:red'>post</b>: {headline: "Ouch", date: "11/12/2016"}
};
</pre>

Everything has changed (except references to strings, since js strings are already
immutable), because ```clone``` created all new objects.
We can pass this to the selector and it will still
avoid recomputing ```header```, but it will have to do a deep-compare
of ```state.post``` in order to determine that the value is unchanged.

In contrast, by using ```_.assocIn()``` above, the selector can simply
test for reference equality, ```state0.post ==== state1.post```. Review
the red portions of ```state1```, above.

In a large state structure, this comparsion is much, much faster. Additionally,
 ```_.assocIn()``` and the other ehmutable methods do not have to do a deep copy
like ```clone()```.  They instead do a path copy, which is much faster: typically
order log(N) vs. order N, for a tree with N nodes.

## Handling collections

This all works fine when your state is json objects with fixed keys. What
about arrays, or dictionaries (objects with variable keys)?

### Components

There are several possible strategies here. React deals with this by
requring a unique ```key``` property on lists of elements. Here we
use the position in a list as the ```key``` property, uniquely identifying
each ```<li>``` so React can effectively test equality of the passed
 ```props```.


```jsx
	render() {
		return (
			<ul>
				{posts.map((text, i) => <li key={i}>{text}</li>)}
			</ul>
		);
	}
```

If the order of ```posts``` can change, a different ```key``` would be more
appropriate: perhaps a uuid, or a database primary key for the post.

### selectors 

For selectors we instead model collections as dictionaries, and use
the dictionary selector constuctor ```createFmapSelector```. These
selectors will execute a function per-key in the dictionary, caching
the key names and results.

For example, our application state looks a bit like the following,

<pre>
{
	columns: {
		columnA: {...},
		columnB: {...},
		columnC: {...}
	},
	columnOrder: ['columnC', 'columnA', 'columnB'],
	data: {
		columnA: {...}.
		columnB: {...}.
		columnC: {...}.
	}
}
</pre>

except we use uuids instead of names 'columnA', 'columnB', etc.


We then create a memoized 'index' calculation over all column data, like so:

```javascript
var indexSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				_.getIn(column, ['fieldType']),
				state.data[key]]),
		args => widgets.index(...args));
```

## Implementation details

### React

React lets you finely control when a component should be re-rendered, via
the ```shouldComponentUpdate()``` component method: you provide an implementation
that is passed the new ```state``` and ```props```, and returns true if
the component should re-render.

If your components are pure, meaning they are entirely a function of
 ```state``` and ```props```, you can simply do a deep equality check of
 ```state``` and ```props```.  For this purpose we use the ```deepPureRenderMixin```
on our components.

### Selectors

Similarly, the Reselect library which provides ```createSelector``` allows
setting the comparsion function. We set this to a deep equal.

### Deep vs. shallow compare

React comes with a ```pureRenderMixin``` which does a shallow compare: only
checking for reference equality of the keys of the object. Similarly,
Reselect by default does a shallow compare. Both libs will claim that this is
for performance reasons: that a deep equal is expensive.

In practice, the difference is tiny, and doing a shallow compare is much
less robust: one mistake causes a huge degradation of performance. In contrast, a
missed reference in a deep equal check typically costs a few microseconds, as
one extra layer in the state tree is inspected.

The main cost of a deep equal is in the case of inequality. On reference
inequality, a deep equal will recurse to the next level of the tree. If
your state tree is very deep, this could become problematic. In most UIs,
the state tree is unlikely be more than four or five nodes in height. The
time to check this is barely measureable.

In cases where it matters (as verified by a profiler), it's easy to provide a
custom comparator to React or Reselect. We've never needed to do this.

### More notes on immutability

Immutable helpers like ehmutable work fine until your data structures are
too long, or too deep. We do have large arrays in our application, but they
are not arrays that we modify: we never need to append an element to an
array of 10k elements. ehmutable would work poorly if we did.

If the data is large in length or height, a hash trie based library like
immutable.js is more appropriate.

Javascript ES6 provides a number of methods for creating new objects, and it's
tempting to leverage them for creating new state. However, these methods
are less aggressive about preserving reference equality. Here we
compare ES6 object spread, and ehmutable ```assocIn()```, when making a change
to a structure that ultimately doesn't change its value:

```
~/ucsc-xena-client> babel-node
> var _u = require('./js/underscore_ext')
'use strict'
> var x = {a: 1, b: 2}
'use strict'
> ({...x, b: 2} === x)
false
> _u.assoc(x, 'b', 2) === x
true
```

This behavior of ehmutable is recursive:

```
> var x = {a: {b: {c: 7, d: 8}}}
'use strict'
> _u.assocIn(x, ['a', 'b', 'd'], 8) === x
true
```

This lets us avoid writing ad hoc code to test for conditions like "the data
from the server hasn't changed". We can always update state with new data,
and count on ehmutable to preserve reference if the underlying value is
unchanged.
