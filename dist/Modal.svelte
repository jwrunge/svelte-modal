<script>
    import { fade, scale, fly, slide } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'

    let dispatch = createEventDispatcher()

    //Transitions
    export let transbg = "fade"
    export let transinner = "scale"
    export let transbgInOptions = {duration: 200}
    export let transbgOutOptions = {duration: 200}
    export let transinnerInOptions = {duration: 200}
    export let transinnerOutOptions = {duration: 200}

    //Set dynamic transitions
    let transbgFunc, transinnerFunc

    switch(transbg) {
        case "fade":
            transbgFunc = fade
            break
        case "scale":
            transbgFunc = scale
            break
        case "fly":
            transbgFunc = fly
            break
        case "slide":
            transbgFunc = slide
            break
    }

    switch(transinner) {
        case "fade":
            transinnerFunc = fade
            break
        case "scale":
            transinnerFunc = scale
            break
        case "fly":
            transinnerFunc = fly
            break
        case "slide":
            transinnerFunc = slide
            break
    }

    //Loading and closing
    export let loading = false
    export let loadpos = "modal-load-top-right"
    export let loadiconwidth = "4rem"
    export let loadiconpath = "/icons/loading.svg"
    export let loadingtext = ""
    export let fadeonload = false
    export let closable = true
    export let closepos = "modal-closer-right"
    export let bgclose = false

    //Display options
    export let heading = ""
    export let bgcolor = "rgba(0,0,0,.7)"
    export let innerbg = "white"
    export let wide = false
    export let fullwidth = false
    export let zindex = 25
    export let borderradius = "5px"
    export let topoffset = "0"

    //Visibility toggle (for vanilla js)
    export let visible = true

    //Slot prop (for vanilla js)
    export let content = ""

    //Can emit close signal if set
    function bgclick() {
        if(!bgclose || !closable || loading) return
        dispatch("close")
    }
</script>

{#if visible}
    <div on:click={bgclick} in:transbgFunc={transbgInOptions} out:transbgFunc={transbgOutOptions} class="modal modal-backdrop" style="background-color: {bgcolor}; z-index: {zindex};">
        <div on:click|stopPropagation in:transinnerFunc={transinnerInOptions} out:transinnerFunc={transinnerOutOptions} class="modal-inner modal-bordered" class:wide={wide} class:full={fullwidth} on:click|stopPropagation style="background: {innerbg}; border-radius: {borderradius}; top: {topoffset};">
            <!-- Determine whether to show loader or closer -->
            {#if loading}
                {#if loadingtext}
                    <div class="modal-load-icon {loadpos}">{loadingtext}</div>
                {:else}
                    <img src={loadiconpath} alt="loading" class="modal-load-icon {loadpos}" style="width: {loadiconwidth}">
                {/if}
            {:else if closable}
                <div class="modal-closer {closepos}" on:click|stopPropagation={()=>{dispatch("close")}}>&times;</div>
            {/if}

            <!-- Content (scrollable) -->
            <div class="modal-scroller" class:faded={fadeonload && loading}>
                <!-- Heading, if applied -->
                {#if heading}
                    <h2>{heading}</h2>
                {/if}
                <!-- Content, if applied -->
                {#if content}
                    {@html content}
                <!-- Otherwise, load from slot -->
                {:else}
                    <slot></slot>
                {/if}
            </div> <!-- end .scroller -->
        </div> <!-- end .inner -->
    </div>  <!-- end .modal, .backdrop -->
{/if}

<style>
    .modal.modal-backdrop {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        padding: 2rem;
    }

    .modal .modal-inner {
        position: relative;
        padding: 2rem 1.5rem;
        width: 30rem; min-width: 0; max-width: 95%;
        overflow-y: hidden;
        box-sizing: border-box;
    }
        
    .modal .modal-inner.modal-wide {
        width: 60rem;
    }

    .modal .modal-inner.modal-full {
        width: 95%;
    }

    .modal .modal-inner .modal-closer {
        cursor: pointer;
        font-size: 2rem;
        position: absolute;
        top: .25rem;
    }

    .modal .modal-closer.modal-closer-right, .modal .modal-closer.modal-closer-top-right { right: .75rem; }
    .modal .modal-closer.modal-closer-left, .modal .modal-closer.modal-closer-top-left { left: .75rem; }

    .modal .modal-inner .modal-load-icon {
        display: block;
        position: absolute;
    }

    .modal .modal-load-icon.modal-load-top-left { top: .5em; left: .5em; }
    .modal .modal-load-icon.modal-load-top-right { top: .5em; right: .5em; }
    .modal .modal-load-icon.modal-load-bottom-left { bottom: .5em; left: .5em; }
    .modal .modal-load-icon.modal-load-bottom-right { bottom: .5em; right: .5em; }

    .modal .modal-load-icon.modal-load-middle {
        position: relative;
        width: 100%;
        text-align: center;
        margin-bottom: .5em;
        z-index: 1;
    }

    .modal .modal-inner .modal-scroller {
        max-height: 85vh;
        overflow-y: auto;
        width: 100%;
    }

    .modal .modal-inner .modal-faded { opacity: .5; }
</style>