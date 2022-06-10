<script>
    import { createEventDispatcher } from 'svelte'
    const dispatch = createEventDispatcher()

    // Sizes
	const sizes = [
		{
			name: "Mini",
			size: 5,
			min: 2,
			max: 5,
		},
		{
			name: "Small",
			size: 7,
			min: 6,
			max: 10,
		},
		{
			name: "Weekday",
			size: 15,
			min: 11,
			max: 20
		},
		{
			name: "Large",
			size: 23,
			min: 21,
			max: 26
		},
		{
			name: "XLarge",
			size: 27,
			min: 27,
			max: 30
		}
	];

    export let size;
    let current_size = findSize(size);
    
    function findSize(size) {
        return sizes.find(s => size >= s.min && size <= s.max);
    }

    function handleStateChange() {
        current_size = findSize(size);
        dispatch("change");
    }
</script>

<main>
    <input type="range" min="2" max="30" bind:value="{size}" on:change="{handleStateChange}">
    <label for="size">{`${findSize(size).name} ${size}x${size}`}</label>
</main>


<style lang="scss">
    main {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: left;
        align-items: start;
        margin-bottom: 10px;
        input {
            // margin-right: 10px;
            min-width: 400px;
        }
    }
</style>