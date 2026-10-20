function queryParser(input) {
    const tokens = [];
    const operators = new Set(["AND", "OR", "NOT"]);
    let position = 0;

    while (position < input.length) {
        const character = input[position];

        // Ignore whitespace between tokens.
        if (/\s/.test(character)) {
            position++;
            continue;
        }

        if (character === "(" || character === ")") {
            throw new Error("Parentheses are not supported yet.");
        }

        // Everything inside double quotes is one phrase.
        if (character === '"') {
            position++;
            const start = position;

            while (position < input.length && input[position] !== '"') {
                position++;
            }

            if (position === input.length) {
                throw new Error("Unmatched double quote.");
            }

            const phrase = input.slice(start, position).trim();

            if (!phrase) {
                throw new Error("A phrase cannot be empty.");
            }

            tokens.push({ type: "phrase", value: phrase });
            position++; // Move past the closing quote.
            continue;
        }

        // Read an unquoted word.
        const start = position;

        while (
            position < input.length &&
            !/\s/.test(input[position]) &&
            !['"', "(", ")"].includes(input[position])
        ) {
            position++;
        }

        const word = input.slice(start, position);

        tokens.push({
            type: operators.has(word) ? "operator" : "term",
            value: word
        });
    }

    return tokens;
}

module.exports = queryParser;