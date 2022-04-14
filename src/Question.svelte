<script>
    // Requirements
    import { createEventDispatcher } from 'svelte';
    import { suggest } from "./suggestions/suggest";
    
    const dispatch = createEventDispatcher();
    import { questionsAcross, questionsDown, isEditingQuestion, currentQuestion, currentDirection } from "./stores.js";

    // Exposed props
    export let questions_across = [];
    export let questions_down = [];
    export let question;
    export let direction;

    // Private props
    let suggestions = [];

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

    function useSuggestion(suggestion) {
        suggestion = suggestion.toUpperCase();
        let qs = $questionsDown;
        if (question.direction === "across") {
            qs = $questionsAcross;
        }
        qs[qs.findIndex(q => q.num === question.num)];
        let q = qs.find(q => q.num === question.num);
        dispatch("update_question", {suggestion, question: q});
    }

    let is_current_question = false;

    $: {
        let suggestion_query = question.answer.replace(/\ /g, "?");
        if (!suggestion_query.includes("?")) {
            suggestions = [];
        } else {
            suggestions = suggest(suggestion_query);
        }
        is_current_question = ($currentQuestion.num === question.num && $currentDirection === question.direction);
    }
</script>

<main class:current="{is_current_question}">
    {#if question.editing}
    <div class="jxword-question jxword-question-editing">
        <div class="jxword-question-number">
            <span>{question.num}</span>
        </div>
        <input type="text" class="jxword-question-text" bind:value="{question.question}" autofocus on:keydown="{handleKeydown}" />
        <div class="jxword-question-answer">
            {question.answer}
        </div>
        <div class="btn" on:click="{saveQuestion(question)}">Save</div>
    </div>
    {:else}
    <div class="jxword-question" on:dblclick="{editQuestion(question)}">{question.num}: {question.question || "No question set"} ~ {question.answer}
    {#if suggestions.length}
        {#each suggestions as suggestion}
            <span class="suggestion" on:click="{useSuggestion(suggestion)}">{suggestion}</span>
        {/each}
    {/if}
    </div>
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
    .suggestion {
        font-size: 9pt;
        background-color: #2e4877;
        color: white;
        margin-right: 0.5em;
        padding: 2px 3px;
        border-radius: 2px;
        cursor: pointer;
    }
    .current {
        background-color: #9ce0fb;
        // color: white;
    }
</style>