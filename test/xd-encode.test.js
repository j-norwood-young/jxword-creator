import { XDEncode } from "../src/xd-encode.js";

const test_xd = `Title: This Is 
Author: Jason
Editor: Kim
Date: 2022-02-19


THIS#IS#A
EACH#CEST
SSH#BRAVE
TT#BEIGE#
#E#OVERLY
##PREDATE
#WEIR#SEA
#OWN##S#H
OZ#G#####


A1. Not That ~ THIS
A5. You might study this instead of IT ~ IS
A8. ... and every ~ EACH
A9. Such is la vie ~ CEST
A11. It would encrypt this puzzle ~ SSH
A12. Pixar's first female-hero movie ~ BRAVE
A13. An Audi flavour ~ TT
A14. A little bit drab ~ BEIGE
A15. Excessively ~ OVERLY
A17. It comes before ~ PREDATE
A18. It'll hold back the water ~ WEIR
A19. One if by land, two if by ... ~ SEA
A20. Rent to ... ~ OWN
A21. What you might find at the end of a yellow-brick road ~ OZ

D1. This Is A Drill ~ TEST
D2. It makes waste ~ HASTE
D3. German I ~ ICH
D4. This is a library ~ SH
D5. What you did at the end of Forrest Gump ~ ICRIED
D6. Poseidon might mow it ~ SEAGRASS
D7. What you might have done before you came ~ ATE
D10. What this crossword creator is built in ~ SVELTE
D12. You get some furry ones ~ BEVER
D14. *Yawn* ~ BORING
D16. You go! ~ YEAH
D17. Double-up to kill Stormtroopers ~ PEW
D18. One of the great Steves ~ WOZ
`;

const test_obj = {
    "grid": [
        [
            "T",
            "H",
            "I",
            "S",
            "#",
            "I",
            "S",
            "#",
            "A"
        ],
        [
            "E",
            "A",
            "C",
            "H",
            "#",
            "C",
            "E",
            "S",
            "T"
        ],
        [
            "S",
            "S",
            "H",
            "#",
            "B",
            "R",
            "A",
            "V",
            "E"
        ],
        [
            "T",
            "T",
            "#",
            "B",
            "E",
            "I",
            "G",
            "E",
            "#"
        ],
        [
            "#",
            "E",
            "#",
            "O",
            "V",
            "E",
            "R",
            "L",
            "Y"
        ],
        [
            "#",
            "#",
            "P",
            "R",
            "E",
            "D",
            "A",
            "T",
            "E"
        ],
        [
            "#",
            "W",
            "E",
            "I",
            "R",
            "#",
            "S",
            "E",
            "A"
        ],
        [
            "#",
            "O",
            "W",
            "N",
            "#",
            "#",
            "S",
            "#",
            "H"
        ],
        [
            "O",
            "Z",
            "#",
            "G",
            "#",
            "#",
            "#",
            "#",
            "#"
        ]
    ],
    "size": 9,
    "current_x": 5,
    "current_y": 8,
    "direction": "across",
    "questions_across": [
        {
            "num": 1,
            "x": 0,
            "y": 0,
            "question": "Not That",
            "answer": "THIS",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 5,
            "x": 5,
            "y": 0,
            "question": "You might study this instead of IT",
            "answer": "IS",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 8,
            "x": 0,
            "y": 1,
            "question": "... and every",
            "answer": "EACH",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 9,
            "x": 5,
            "y": 1,
            "question": "Such is la vie",
            "answer": "CEST",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 11,
            "x": 0,
            "y": 2,
            "question": "It would encrypt this puzzle",
            "answer": "SSH",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 12,
            "x": 0,
            "y": 2,
            "question": "Pixar's first female-hero movie",
            "answer": "BRAVE",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 13,
            "x": 0,
            "y": 2,
            "question": "An Audi flavour",
            "answer": "TT",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 14,
            "x": 0,
            "y": 2,
            "question": "A little bit drab",
            "answer": "BEIGE",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 15,
            "x": 3,
            "y": 4,
            "question": "Excessively",
            "answer": "OVERLY",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 17,
            "x": 2,
            "y": 5,
            "question": "It comes before",
            "answer": "PREDATE",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 18,
            "x": 1,
            "y": 6,
            "question": "It'll hold back the water",
            "answer": "WEIR",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 19,
            "x": 6,
            "y": 6,
            "question": "One if by land, two if by ...",
            "answer": "SEA",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 20,
            "x": 7,
            "y": 2,
            "question": "Rent to ...",
            "answer": "OWN",
            "editing": false,
            "direction": "across"
        },
        {
            "num": 21,
            "x": 0,
            "y": 8,
            "question": "What you might find at the end of a yellow-brick road",
            "answer": "OZ",
            "editing": false,
            "direction": "across"
        }
    ],
    "questions_down": [
        {
            "num": 1,
            "x": 0,
            "y": 0,
            "question": "This Is A Drill",
            "answer": "TEST",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 2,
            "x": 1,
            "y": 0,
            "question": "It makes waste",
            "answer": "HASTE",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 3,
            "x": 2,
            "y": 0,
            "question": "German I",
            "answer": "ICH",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 4,
            "x": 3,
            "y": 0,
            "question": "This is a library",
            "answer": "SH",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 5,
            "x": 5,
            "y": 0,
            "question": "What you did at the end of Forrest Gump",
            "answer": "ICRIED",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 6,
            "x": 6,
            "y": 0,
            "question": "Poseidon might mow it",
            "answer": "SEAGRASS",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 7,
            "x": 8,
            "y": 0,
            "question": "What you might have done before you came",
            "answer": "ATE",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 10,
            "x": 7,
            "y": 1,
            "question": "What this crossword creator is built in",
            "answer": "SVELTE",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 12,
            "x": 4,
            "y": 2,
            "question": "You get some furry ones",
            "answer": "BEVER",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 14,
            "x": 3,
            "y": 3,
            "question": "*Yawn*",
            "answer": "BORING",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 16,
            "x": 8,
            "y": 4,
            "question": "You go!",
            "answer": "YEAH",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 17,
            "x": 2,
            "y": 5,
            "question": "Double-up to kill Stormtroopers",
            "answer": "PEW",
            "editing": false,
            "direction": "down"
        },
        {
            "num": 18,
            "x": 1,
            "y": 6,
            "question": "One of the great Steves",
            "answer": "WOZ",
            "editing": false,
            "direction": "down"
        }
    ],
    "title": "This Is ",
    "author": "Jason",
    "editor": "Kim",
    "date": "2022-02-19"
}
test('Test XD Encode', () => {
    const obj = XDEncode(test_obj);
    expect(obj).toEqual(test_xd);
});