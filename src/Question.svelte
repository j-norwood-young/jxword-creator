<script>
    export let question;
    export let direction;
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    import { questionsAcross, questionsDown, isEditingQuestion } from "./stores.js";
    export let questions_across = [];
    export let questions_down = [];

    function editQuestion(question) {
        question.editing = true;
        isEditingQuestion.set(true);
        if (direction == "across") {
            questionsAcross.set(questions_across);
        } else {
            questionsDown.set(questions_down);
        }
    }

    function saveQuestion(question) {
        if (direction == "across") {
            questionsAcross.set(questions_across);
        } else {
            questionsDown.set(questions_down);
        }
        isEditingQuestion.set(false);
        question.editing = false;
        dispatch("save", { question, direction });
        dispatch("change");
    }

    function handleKeydown(e) {
        if (e.key == "Enter") {
            saveQuestion(question);
        }
    }
</script>

<main>
    {#if question.editing}
    <div class="jxword-question jxword-question-editing">
        <div class="jxword-question-number">
            <span>{question.num}</span>
        </div>
        <input type="text" class="jxword-question-text" bind:value="{question.question}" autofocus on:keydown="{handleKeydown}" />
        <div class="jxword-question-answer">
            <input type="text" class="jxword-question-text" bind:value="{question.answer}" />
        </div>
        <div class="btn" on:click="{saveQuestion(question)}">Save</div>
    </div>
    {:else}
    <div class="jxword-question" on:dblclick="{editQuestion(question)}">{question.num}: {question.question || "No question set"} ~ {question.answer}</div>
    {/if}
</main>

<style lang="scss">
    .jxword-question {
        margin-bottom: 5px;
        border-bottom: 1px #ccc solid;
    }
    .btn {
        background-color: #4CAF50; /* Green */
        border: none;
        color: white;
        padding: 5px 12px;
        margin: 5px 0px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        cursor: pointer;
    }
</style>