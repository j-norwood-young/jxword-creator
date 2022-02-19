<script>
    // Dispatcher
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    let showMenu = false;

    function handleReset(e) {
        e.preventDefault();
        dispatch('reset');
        showMenu = false;
    }
</script>

<main>
    <nav class="jxword-controls">
        <div class="jxword-menu-toggle">
            <input type="checkbox" bind:checked="{showMenu}" />
            <span class="jxword-hamberder"></span>
            <span class="jxword-hamberder"></span>
            <span class="jxword-hamberder"></span>
            <ul class="jxword-menu">
                <!-- <a href={"#"} class="jxword-button"><li>Puzzle Info</li></a>
                <li class="jxword-menu-break"><hr></li>
                <a href={"#"} class="jxword-button"><li>Autocheck</li></a>
                <a href={"#"} class="jxword-button"><li>Check Square</li></a>
                <a href={"#"} class="jxword-button"><li>Check Word</li></a>
                <a href={"#"} class="jxword-button"><li>Check Puzzle</li></a>
                <li class="jxword-menu-break"><hr></li> -->
                <a href={"#"} class="jxword-button" on:click="{handleReset}"><li>Reset</li></a>
            </ul>
        </div>
    </nav>
</main>

<style lang="scss">
    /*
 * Made by Erik Terwan
 * 24th of November 2015
 * MIT License
 *
 *
 * If you are thinking of using this in
 * production code, beware of the browser
 * prefixes.
 */

.jxword-menu-toggle
{
    display: block;
    position: relative;
    top: 0px;
    left: 0px;
    z-index: 10;
    -webkit-user-select: none;
    user-select: none;
    
    a {
        text-decoration: none;
        color: #232323;
        transition: color 0.3s ease;
    }

    li:hover {
        background-color: #b8ddec;
    }

    // .jxword-menu-break:hover {
    //     background-color: white;
    // }

    input {
        display: block;
        width: 40px;
        height: 32px;
        position: absolute;
        top: -7px;
        left: -5px;

        cursor: pointer;

        opacity: 0; /* hide this */
        z-index: 2; /* and place it over the hamburger */

        -webkit-touch-callout: none;
    }

    /*
    * Just a quick hamburger
    */
    span {
        display: block;
        width: 18px;
        height: 3px;
        margin-bottom: 3px;
        position: relative;
        
        background: #000000;
        border-radius: 0px;
        
        z-index: 1;
        
        // transform-origin: 3px 0px;
        
        // transition: transform 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
        // background 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
        // opacity 0.55s ease;
    }
}

/*
 * Make this absolute positioned
 * at the top left of the screen
 */
.jxword-menu {
    position: absolute;
    width: 250px;
    margin: -23px 0 0 -5px;
    padding: 23px 10px 10px 10px;
  
    background: #FFFFFF;
    list-style-type: none;
    -webkit-font-smoothing: antialiased;
    /* to stop flickering of text in safari */
  
    transform-origin: 0% 0%;
    transform: translate(-0%, 50px);
    opacity: 0;
    visibility: hidden;
    // display: none;
    z-index: -1;
    transition: transform 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
                opacity 0.55s ease,
                visibility 0.55s ease;
                ;
    border-radius: 5px;
    border: 1px solid rgba(36, 36, 36, 0.5);
}

.jxword-menu li {
    padding: 10px 0;
    font-size: 12pt;
    pointer-events: auto;
    z-index: 10;
}

/*
 * And let's slide it in from the left
 */
.jxword-menu-toggle input:checked ~ ul {
    transform: none;
    opacity: 1;
    visibility: visible;
    // display: block;
}
</style>