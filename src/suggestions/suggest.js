import words from "./words";

/* 
 Ask for word suggestions that would fit in a certain pattern.
 The pattern is defined by using ?'s for the blank letters
 A maximum of three and a minimum of no words are returned.
 If the resulting set is more than three words, the resulting three 
 will be selected randomly.
 eg. "?x??r?" might suggest "jxword"
*/
export function suggest(pattern) {
    pattern = pattern.toLowerCase();
    // First let's just consider words of the correct length
    let matches = words.filter(word => word.length === pattern.length);
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] !== "?") {
            matches = matches.filter(word => word[i] === pattern[i]);
        }
    }
    if (matches.length <= 3) return matches;
    let result = [];
    for (let i = 0; i < 3; i++) {
        let index = Math.random() * matches.length;
        result.push(...matches.splice(index, 1));
    }
    return result;
}