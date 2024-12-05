// Find the fp number in a range that has the smallest decimal representation.
// This file was AI generated.

function ulp(x) {
    if (x === 0) {return Number.MIN_VALUE;} // Smallest positive subnormal
    const absX = Math.abs(x);
    const exp = Math.floor(Math.log2(absX));
    return Math.pow(2, exp - 52); // IEEE 754 double precision
}

function nextUp(x) {
    if (!isFinite(x)) {return x;} // Infinity or NaN
    if (x === 0) {return Number.MIN_VALUE;} // Smallest positive subnormal
    const next = x + ulp(x);
    return next === x ? x + ulp(x) * 2 : next;
}

// Find short decimal in range. x is inclusive, y exclusive. e.g. if
// x < y range is [x, y). If y < x, range is (y, x].
export default function shortestDecimal(x, y) {
    if (x === y) {return x;} // If the range is a single point, return it

    // Determine if range is reversed
    let reversed = false;
    if (x > y) {
        [x, y] = [y, x];
        reversed = true;
    }

    // Constants
    const MIN_NORMAL = 2 ** -1022; // Smallest normalized value
    const MAX_SAFE_DIGITS = 17;    // IEEE 754 double precision significant decimal digits
    const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

    // Helper to check if a candidate is valid
    function isValid(candidate) {
        const candidateFloat = parseFloat(candidate);
        if (!reversed) {
            // Range [x, y)
            return candidateFloat >= x && candidateFloat < y;
        } else {
            // Range (y, x]
            return candidateFloat > x && candidateFloat <= y;
        }
    }

    let shortest = null;

    // Iterate over possible decimal representations
    for (let digits = 1; !shortest && digits <= MAX_SAFE_DIGITS; digits++) {
        const factor = Math.pow(10, digits);
        const lowerBound = Math.ceil(x * factor);
        const upperBound = Math.floor(y * factor) - (reversed ? 0 : 1); // Adjust for exclusivity

        // Skip iteration if bounds exceed MAX_SAFE_INTEGER
        if (lowerBound > MAX_SAFE_INTEGER || upperBound > MAX_SAFE_INTEGER) {
            break;
        }

        // Iterate over potential candidates
        for (let i = lowerBound; i <= upperBound; i++) {
            const candidate = (i / factor).toFixed(digits);

            if (
                isValid(candidate) &&
                (shortest === null ||
                 candidate.length < shortest.length ||
                 (candidate.length === shortest.length && parseFloat(candidate) < parseFloat(shortest)))
            ) {
                shortest = candidate;
            }
        }
    }

    // Handle edge case: subnormal range
    if (x < MIN_NORMAL && shortest === null) {
        let subnormalCandidate = x;
        while ((!reversed && subnormalCandidate < y) || (reversed && subnormalCandidate <= y)) {
            if (isValid(subnormalCandidate.toString())) {
                return parseFloat(subnormalCandidate.toString());
            }
            subnormalCandidate = nextUp(subnormalCandidate); // Increment by smallest step
        }
    }

    return shortest === null ? (reversed ? y : x) : parseFloat(shortest);
}
