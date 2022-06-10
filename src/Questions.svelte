<main>
    <div class="jxword-questions">
        <div class="jxword-questions-direction jxword-questions-across">
            <h4>Across</h4>
                {#each questions_across as question}
                    <Question question={question} direction={"across"} questions_across={questions_across} on:change on:update_question />
                {/each}
        </div>
        <div class="jxword-questions-direction jxword-questions-down">
            <h4>Down</h4>
                {#each questions_down as question}
                    <Question question={question} direction="down" questions_down={questions_down} on:change on:update_question />
                {/each}
        </div>
    </div>
</main>

<script>
    import Question from "./Question.svelte";

    import { questionsAcross, questionsDown } from "./stores.js";
    let questions_across = [];
    let questions_down = [];

    questionsAcross.subscribe(value => {
		questions_across = value;
	});

    questionsDown.subscribe(value => {
        questions_down = value;
    });
    
</script>

<style lang="scss">
    main {
        width: 50%;
    }
    .jxword-questions {
        width: 100%;
        display: flex;
        flex-direction: row;
        align-items: left;
        justify-content: left;
        text-align: left;
    }
    .jxword-questions-direction {
        margin: 0px 10px;
    }
    
</style>