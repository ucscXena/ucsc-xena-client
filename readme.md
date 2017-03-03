# UCSC Xena Client
Functional genomics browser

## Developer docs

This is a browser app, written in javascript. The primary technologies we use
are [React](https://facebook.github.io/react/), the
HTML [2d canvas API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D),
and [RxJS](https://github.com/Reactive-Extensions/RxJS). We use [babel](https://babeljs.io/) for
[es6](https://babeljs.io/learn-es2015/) support, and webpack
for the build.

The application architecture looks a lot like redux, but was developed before
redux was a thing. So, we can use redux dev tooling, and the reselect lib, but
we currently do not use redux itself. The async model is in the direction of
redux-observable, with action side-effects invoking rx streams that will then
dispatch later actions.

Further doc links:

 * [Architecture overview](docs/overview.md)
 * [State updates, in detail](docs/immutable-updates.md)
 * [Debug strategies, widget hierarchy, etc.](docs/details.md)
 * [Writing an action handler](docs/howdoi.md)

## Build
The build is based on npm and webpack.
 * Ensure that git and node are installed
   * On OSX, install brew http://brew.sh/
   * `brew install git`
   * `brew install node`
 * `git clone https://github.com/acthp/ucsc-xena-client.git`
 * `cd ucsc-xena-client`
 * `npm install`
 * `npm start`
 * browse to [http://localhost:8080/webpack-dev-server/heatmap/](http://localhost:8080/webpack-dev-server/heatmap/)

There may be npm warnings about missing redux libraries, but these can be ignored. We're not using redux. We're
just using redux tooling.

### References
 * http://blog.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool/
 * http://webpack.github.io/
