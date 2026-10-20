// Levenshtein distance: insertion, deletion, and substitution each cost one.
function editDistance(left, right) {
    let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let i = 1; i <= left.length; i++) {
        const current = [i];
        for (let j = 1; j <= right.length; j++) {
            current[j] = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
            );
        }
        previous = current;
    }
    return previous[right.length];
}

function suggest(word, vocabulary, limit = 5) {
    return vocabulary
        .filter(candidate => Math.abs(candidate.length - word.length) <= 2)
        .map(candidate => ({ word: candidate, distance: editDistance(word, candidate) }))
        .filter(candidate => candidate.distance <= 2)
        .sort((a, b) => a.distance - b.distance || a.word.localeCompare(b.word))
        .slice(0, limit).map(candidate => candidate.word);
}

function complete(prefix, vocabulary, limit = 10) {
    return vocabulary.filter(word => word.startsWith(prefix)).sort().slice(0, limit);
}

module.exports = { editDistance, suggest, complete };
