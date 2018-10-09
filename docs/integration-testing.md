# Xena client integration testing

## Goals and requirements

'Integration testing' here means exercising the client code in the browser,
i.e. automated in-browser testing. The goal is to cover parts of the
code that are difficult to test via unit tests, e.g. things that depend
on user interaction with the browser, that happen across page loads, or
that require several modules acting together.

A secondary goal is to do this via generative testing methods, in order to
cover a much larger portion of the UI surface than we would with manually
written tests.

The first requirement for any test suite is reliability: the results of testing
must be trustworthy. If a test suite regularly emits false positives due to
flakey internals of the test runner itself, the suite is less than useless: it
trains developers to ignore test results, and so hides bugs, instead of
revealing them. This is why we've never deployed selenium tests.

## Cypress

Cypress is a more recent tool for integration tests, which has proved to be
reliable in our evaluations.

https://docs.cypress.io

The main difference between cypress and selenium is that cypress runs in the
same browser context as your application, instead of via browser automation
hooks. This puts some limits on what can be tested, e.g. multi-tab scenarios
are difficult to test in this paradigm. However, it removes a lot of
complexity, and seems to result in a far more robust test runner.

Cypress tests are written with modified Promises to handle asynchrony. A
singleton Promise chain is maintained, which ensures repeatable tests, and
somewhat simplifies writing sequences of async commands.

## Page objects

We adopt the "page object" organization of integration tests that is common
in the selenium community, where all strings and patterns necessary for
testing a page are kept in a data structure, rather than coded in-place in
the test cases. This is because page data is expected to be highly volatile
as the application is developed.

For example, a test case may need to interact with a button having a particular label.

```javascript
cy.contains('Kaplan Meier').click();
```

If the label is later changed to "Surivival plot", all uses of "Kaplan Meier"
must be updated in all test cases. Instead, the string is put in an approprate
page object.

```javascript
var spreadsheet = {
	kmButton: () => cy.contains('Kaplan Meier')
};
```

The test cases always access DOM elements via a page object.

```javascript
spreadsheet.kmButton().click();
```

## Making it generative

Generating tests randomly is sometimes called 'fuzzing', and sometimes called
'generative testing'. In practice the difference seems to be that the
'generative testing' community is committed to using test results to direct the
random search. In particular, when a test fails, new tests are generated around
the failure case, to find simpler failing examples. This tends to result in
much simpler failing test examples.

We use jsverify to implement generative tests. There are some other javascript
generative testing libraries that might be worth investigating.

Generating tests dynamically in a cypress test suite is difficult, or
impossible. It was not built with this use case in mind. Problems that come up
include 1) after any failure it wants to abort the test case, rather than
issuing further commands to isolated the failure, 2) the cypress test runner
retains an enormous amount of memory, especially over page loads, so only a few
generated test cases can be run before the browser crashes. For example, some
of our page loading test scenarios may consume 250M, due to cypress retaining
static assets, XHR responses, and the entire DOM tree for each page load.
Chrome has a limit of 4G per tab, so only about 16 test cases can be run before
the browser crashes.

Since cypress integrates mocha, another approach might be to generate tests
dynamically in mocha.  However, mocha also isn't designed for this. While the
mocha docs describe "dynamic" suites, what it supports is a static test suite
that is computed at run-time: you can't register a new test case based on the
results of a previous test case.

Our solution is to generate test cases outside of cypress, spawning new cypress
instances for each one. This avoids the limitations around dynamically creating new
test cases, and avoids accumulating memory in the browser. Do this is faster
than one might imagine. A test case with a dozen interactive steps runs in
about 25 seconds, so we can run 100 test cases in about 40 minutes.

There are two instances of mocha in our test runs: the "outer" mocha, with a
test case that generates cypress test cases, and the "inner" mocha that is
integrated with cypress, and executes a particular generated test case.

"Outer" test suites are in cypress/generators.

"Inner" test suites are in cypress/integration.

## XHR record and playback

When running longer tests, it's desirable to avoid using a live data server, in
order to speed up the tests, and to avoid data serving expenses. One solution
might be to mock responses using data generators. While this might be worth doing,
it's a large effort.

A quicker solution is to use a live server, but cache responses locally on
disk, so subsequent runs can use mocked responses.

Cypress has some facilities for mocking responses, but they are very limited.
They basically only work for a set of fixed routes, with fixed responses. We,
instead, need to match all routes, and return a response that matches both the
route, and the data in the request.

Additionally, cypress has no way to wait on all XHR requests that might occur
in a test case, which we require in order to record all the responses.

We work around these limitations in cypress/integration/xhrPlayRecord.js, by 1)
maintaining a list of all outstanding requests, and waiting for them all to
complete in a mocha ```after``` hook, and 2) shimming the XHR
```onreadystatechange``` method to inject recorded responses.

### Managing cached responses

Cached responses need to be cleared if there are changes on the server that
result in different data. This is rare. A new client query requires fetching
data for that query, but does not require deleting the rest of the cache.

## Testing state machines

Testing state machines is somewhat more complex that other generative test
scenarios. When testing functional code, one typically only has to generate
random inputs, pass them to the function under test, and make assertions over
the results.

Testing stateful code, in contrast, requires making a sequence of calls, and
typically requires the test harness to have some model of the state of the
system, in order to make assertions about the result. Additionally, the test
harness must know what call sequences are valid, both when generating an
test case, and when shrinking inputs to a failed test case.

Our solution is adapted from presentations by John Hughes, and this clojure
blog post.

http://blog.guillermowinkler.com/blog/2015/04/12/verifying-state-machine-behavior-using-test-dot-check/

Basically, this presents an abstraction for modeling a state machine. The state
machine is defined by a state object, and a set of commands (actions) that
compute a new state object. Commands additionally have methods to generate
a command of that type, and methods to check if such a command can be
applied to the current state.

For example, a 'delete' command that removes an element from a list would
only be valid if the list was not empty. Its generate method would randomly
pick a element to be deleted.

## Screenshots

## Workflow and organization

Start a cypress interactive session with

```
npm run cypress:open
```

Run non-generative suites with

```
npm run cypress:run
```

Run generative tests with

```
npm run cypress:gen
```

On failure of a generative test, the failed test input and video files are kept
in cypress/failures. Use ```ls -tl``` to identify the first and last
(minimized) failure cases.

The test cases can be run interactively by setting ```CYPRESS_SEQUENCE_FILE``` when
starting cypress, and running the appropriate spec file (currently, page-loading-spec.js);

```
CYPRESS_SEQUENCE_FILE=cypress/failures/g42ou.json npm run cypress:open
```
