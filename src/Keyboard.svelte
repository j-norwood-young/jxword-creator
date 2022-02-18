<script>
    import { isEditingQuestion } from "./stores.js";
    let is_editing_question = false;
    isEditingQuestion.subscribe(value => {
        is_editing_question = value;
    });

    
</script>

<main>
    <div class="jxword-keyboard mobile-only">
        <div class="jxword-keyboard-row">
            <div class="jxword-key" data-key="Q">Q</div>
            <div class="jxword-key" data-key="W">W</div>
            <div class="jxword-key" data-key="E">E</div>
            <div class="jxword-key" data-key="R">R</div>
            <div class="jxword-key" data-key="T">T</div>
            <div class="jxword-key" data-key="Y">Y</div>
            <div class="jxword-key" data-key="U">U</div>
            <div class="jxword-key" data-key="I">I</div>
            <div class="jxword-key" data-key="O">O</div>
            <div class="jxword-key" data-key="P">P</div>
        </div>
        <div class="jxword-keyboard-row">
            <div class="jxword-key" data-key="A">A</div>
            <div class="jxword-key" data-key="S">S</div>
            <div class="jxword-key" data-key="D">D</div>
            <div class="jxword-key" data-key="F">F</div>
            <div class="jxword-key" data-key="G">G</div>
            <div class="jxword-key" data-key="H">H</div>
            <div class="jxword-key" data-key="J">J</div>
            <div class="jxword-key" data-key="K">K</div>
            <div class="jxword-key" data-key="L">L</div>
        </div>
        <div class="jxword-keyboard-row">
            <div class="jxword-key" data-key="Z">Z</div>
            <div class="jxword-key" data-key="X">X</div>
            <div class="jxword-key" data-key="C">C</div>
            <div class="jxword-key" data-key="V">V</div>
            <div class="jxword-key" data-key="B">B</div>
            <div class="jxword-key" data-key="N">N</div>
            <div class="jxword-key" data-key="M">M</div>
            <div class="jxword-key jxword-key-backspace" data-key="BACKSPACE">&lArr;</div>
        </div>
    </div>
</main>

<style lang="scss">

.jxword-keyboard {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-top: 10px;
    .jxword-keyboard-row {
        display: flex;
        flex-direction: row;
        justify-content: center;

        .jxword-key {
            width: calc(100vw / 10);
            height: calc(100vw / 10);
            border: 1px #444 solid;
            margin: 2px;
            justify-content: center;
            align-items: center;
            display: flex;
            cursor: pointer;
            border-radius: 2px;
            background-color: #CCC;
        }

        // .jxword-key.active {
        //     background-color: #444;
        // }
    }
}
.mobile-only {
    display: none;
}
@media (max-width: 640px) {
    .mobile-only {
        display: block;
    }
}
</style>