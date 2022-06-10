<script>
    import { createEventDispatcher, onMount } from 'svelte'
    const dispatch = createEventDispatcher()

    import { symmetry, symmetries } from "./stores.js";

    $symmetries = [
        {
            name: "None",
            fn: (x, y) => [x, y]
        },
        {
            name: "Diagonal",
            fn: (x, y) => [x + y, x - y],
            default: true
        },
        {
            name: "Horizontal",
            fn: (x, y) => [x, y]
        },
        {
            name: "Vertical",
            fn: (x, y) => [x, y]
        },
        {
            name: "Ninety Degree",
            fn: (x, y) => [x + y, x - y]
        }
    ]

    export let symmetry_id;
    
    function handleStateChange() {
        $symmetry = $symmetries[symmetry_id];
        dispatch("change");
    }

    onMount(() => {
        if (!symmetry_id || symmetry_id < 0) {
            symmetry_id = $symmetries.findIndex(s => s.default);
        }
        $symmetry = $symmetries[symmetry_id];
        // setSymmetry();
    });
</script>

<main>
    <h4>Symmetry {$symmetry?.name}</h4>
    {#each $symmetries as symmetry_option, x}
        <div class="jxword-radio-group">
            <input type=radio bind:group={symmetry_id} on:change="{handleStateChange}" name="symmetry" value="{x}">
            <label for="jxword-symmetry">{symmetry_option.name}</label>
        </div>
    {/each}
</main>

<style lang="scss">
    main {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: left;
        align-items: start;
    }

    .jxword-radio-group {
        display: flex;
        flex-direction: row;
        justify-content: left;
        align-items: baseline;
        label {
            margin-left: 10px;
        }
    }
</style>