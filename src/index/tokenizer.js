function tokenize(input) {
    if (!input || !input.trim()) {
        return [];
    }
    const result = input.toLowerCase().split(/[^A-Za-z0-9]+/).filter(ele => ele != '');

    return result;
}

module.exports = tokenize;