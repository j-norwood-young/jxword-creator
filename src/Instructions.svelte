<script>
    export let visible = false;
    function hideInstructions() {
        visible = false;
    }
</script>

<main class:visible="{visible}">
    <div class="close" on:click="{hideInstructions}">&times;</div>
    <h2>Instructions</h2>
    <p>Use "#" to create a blank square.</p>
    <p>Hit Enter or double-click the question on the right to set an answer.</p>
    <p>Use Space to change directions.</p>
    <p>Use arrow keys to navigate.</p>
    <p>Hint: Complete the words before starting on the answers, because you might have to change something!</p>
    <p>Note: This Crossword Creator is in Alpha. <a href="https://github.com/j-norwood-young/jxword-creator/issues">Please report bugs here</a>.</p>
</main>

<style lang="scss">
    main {
        background-color: #9ce0fb;
        border: 1px #486b79 solid;
        border-radius: 5px;
        padding: 0px 20px 10px 20px;
        box-shadow: 0 2px 5px 0 rgba(0,0,0,0.6);
        visibility: hidden;
        display: none;
        position: fixed;
        z-index: 500;

    }

    main.visible {
        visibility: visible;
        display: block;
    }

    .close {
        float: right;
        margin-right: 5px;
        margin-top: 5px;
        cursor: pointer;
    }
</style>