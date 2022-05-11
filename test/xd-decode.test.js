import fs from "fs";
import XDParser from "xd-crossword-parser";

test("Test some decodes", () => {
    const data = fs.readFileSync("./sample/dm-2020-04-15.xd", "utf8");
    const obj = XDParser(data);
    expect(obj.meta.Title).toBe("Crossed Out - 15 April 2020 (Gonzo)");
    expect(obj.meta.Date).toBe("2020-04-15");
    expect(obj.grid.length).toBe(13);
    expect(obj.grid[0].length).toBe(13);
    expect(obj.across[0].question).toBe("Pieces of a drill (4)");
    expect(obj.across[0].answer).toBe("BITS");
    expect(obj.down.length).toBe(12);
    expect(obj.across.length).toBe(13);
    // console.log(obj);
});