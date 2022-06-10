<script>
    import { questionsAcross, questionsDown } from "./stores";
    export let state;

    function printBlank() {
        const svg = document.querySelector(`.jxword-svg`).cloneNode(true);
        const remove_els = [...svg.querySelectorAll(`.jxword-no-print-blank`), ...svg.querySelectorAll(`.jxword-no-print`)];
        for (let remove_el of remove_els) {
            remove_el.remove();
        }
        print(svg);
    }

    function printFilled() {
        const svg = document.querySelector(`.jxword-svg`).cloneNode(true);
        const remove_els = [...svg.querySelectorAll(`.jxword-no-print`)];
        for (let remove_el of remove_els) {
            remove_el.remove();
        }
        print(svg);
    }

    function formatQuestions(direction) {
        let questions;
        if (direction === "down") {
            questions = $questionsDown;
        } else {
            questions = $questionsAcross;
        }
        
        return questions.map(question => `<li>${question.num}: ${question.question}</li>`).join("");
    }

    function print(svg) {
        // console.log(svg);
        const svg_text = svg.outerHTML.replace(/fill="#f7f457"/g, `fill="#ffffff"`).replace(/fill="#9ce0fb"/g, `fill="#ffffff"`);
        const questions_across = `<h4>Across</h4><ol class="jxword-questions-list">${formatQuestions("across")}</ol>`;
        const questions_down = `<h4>Down</h4><ol class="jxword-questions-list">${formatQuestions("down")}</ol>`;
        let printWindow = window.open();
        printWindow.document.write(`<html><head><title>${state.title}</title>`);
        printWindow.document.write(`<style>
            .svg-container {
                height: 35em;
                display:block;
            }
            .jxword-svg {
                height: 100%;
                width: 100%;
            }
            .jxword-questions-list {
                list-style: none;
                line-height: 1.5;
                font-size: 12px;
                padding-left: 0px;
                display: flex;
                flex-direction: column;
                margin-right: 20px;
            }
            .jxword-questions-list-item-num {
                margin-right: 5px;
                text-align: right;
                width: 25px;
                min-width: 25px;
                font-weight: bold;
            }
            .questions {
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
            }
        </style>`);
        printWindow.document.write(`<div class="svg-container">${svg_text}</div>`);
        printWindow.document.write(`<div class="questions">\n`);
        printWindow.document.write(`<div>${questions_across}</div>`);
        printWindow.document.write(`<div>${questions_down}</div>`);
        printWindow.document.write(`</div>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
</script>

<main>
    <button class="jxword-button" on:click="{printFilled}">Print (Filled)</button>
    <button class="jxword-button" on:click="{printBlank}">Print (Blank)</button>
</main>

<style lang="scss">
</style>