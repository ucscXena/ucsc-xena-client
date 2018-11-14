'use strict';

// iterable that returns slices of a file (or blob, I suppose), for working on
// large data in chunks.
// If we use a generator it can only be iterated once. So, manually creating
// an iterable, instead.
export default function chunkFile(file, n = 100 * 1000) {
	return {
		[Symbol.iterator]: () => {
			var size = file.size,
				i = 0;
			return {
				next: () => {
					if (n * i < size) {
						i += 1;
						return {value: file.slice(n * (i - 1), Math.min(n * i, size))};
					}
					return {done: true};
				}
			};
		}
	};
}
