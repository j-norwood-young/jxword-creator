import { suggest } from "../src/suggestions/suggest";

test("Get some suggestions", () => {
    const suggestions = suggest("?e?t");
    console.log(suggestions);
    expect(suggestions.length).toBe(3);
    expect(suggestions[0][1]).toBe("e");
    expect(suggestions[0][3]).toBe("t");
    expect(suggestions[1][1]).toBe("e");
    expect(suggestions[1][3]).toBe("t");
    expect(suggestions[2][1]).toBe("e");
    expect(suggestions[2][3]).toBe("t");
})

test("Absolute match", () => {
    const suggestions = suggest("test");
    console.log(suggestions);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0]).toBe("test");
})

test("Randomised results", () => {
    const suggestions1 = suggest("????");
    const suggestions2 = suggest("????");
    console.log({ suggestions1, suggestions2 });
    expect(suggestions1.length).toBe(3);
    expect(suggestions2.length).toBe(3);
    expect(suggestions1[0]).not.toBe(suggestions2[0]);
    expect(suggestions1[0]).not.toBe(suggestions2[1]);
    expect(suggestions1[0]).not.toBe(suggestions2[2]);
    expect(suggestions1[1]).not.toBe(suggestions2[0]);
    expect(suggestions1[1]).not.toBe(suggestions2[1]);
    expect(suggestions1[1]).not.toBe(suggestions2[2]);
    expect(suggestions1[2]).not.toBe(suggestions2[0]);
    expect(suggestions1[2]).not.toBe(suggestions2[1]);
    expect(suggestions1[2]).not.toBe(suggestions2[2]);
})