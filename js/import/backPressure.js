'use strict';

var Rx = require('../rx');
var {empty} = Rx.Observable;
var EMPTY = empty();

var toItr = iterable => iterable[Symbol.iterator]();

// This is a bit rough. The idea is to implement back pressure by using
// expand() to control the source, but this is all much too subtle.
//
// The pipeline looks like
//
// blobs -> buffers -> sent
//
// Where -> is an async step. Without back-pressure we can pile up buffers, or
// outstanding requests (file reads) for buffers. We want to stop requesting
// buffers when a) there are too many outstanding requests, or b) there are too
// many unsent buffers.
//
// In practice, sending is slower than reading a blob, we can enforce
// "one blob at a time" without loss of speed. This may not be true for
// transposed files. In that case, we may be limited by blob read time,
// or by cpu time to slice the data into buffers. In transposed files, looks
// like there is substantial wasted time between starting a read & getting the
// result. Would be better to queue a few reads. Also, the parsing of lines
// is the largest time sink. Could we pull columns w/o slicing to lines?
// Can we compute outstanding reads? If so, we could issue a read if
// 1) we have less than 1 buffer and 2) we have less than 1 outstanding request.
// Nope... this use of expand with readFn is inherently serial. We would
// have to issue another readFn, like run readFn twice. We could zip two. Would
// that kick off the requests faster? Maybe, but would it delay the next request?
// There's no operator that returns values in order, but subscribes in parallel.
//
// If we had separate threads, would it be any easier? Might be harder, because
// you have to set up communication. A 'read' thread might fill two buffers,
// then queue more reads as a write thread requests them.
//
//
// A lot of the cpu time is in split() in errorChecking.
export default function backPressure(iterable, len, readFn, bufferFn, sendFn) {
	var itr = toItr(iterable),
		bufferCount,
		v = itr.next(),
		stream =
			v.done ? EMPTY :
				readFn(v.value).expand(() => {
					var v = itr.next();
					return v.done ? EMPTY :
						bufferCount.find(c => c < len)
							.switchMap(() => readFn(v.value));
				}),
		// bufferFn should be synchronous, i.e. use the immediate scheduler,
		// so bufferCount will update at each step of 'expand'.
		buffered = bufferFn(stream).share(),
		sent = sendFn(buffered).share();

	bufferCount = buffered.mapTo(1).merge(sent.mapTo(-1))
		.scan((acc, x) => acc + x).startWith(0).shareReplay(1);
	return sent;
}
