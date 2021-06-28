<script>
    import Modal from "./Modal.svelte"
    let modalOpen = false
</script>

<h1>Test page</h1>
<p>Testing modal.</p>
<button on:click={()=>{modalOpen = true}}>Open it!</button>

{#if modalOpen}
    <Modal heading="Svelte modal works!" on:close={()=>{ modalOpen = false }}>
        <p>Here is some generic placeholder text.</p>
        <div style='text-align:center;'>
            <button on:click={()=>{ modalOpen = false }}>Close Modal</button>
        </div>
    </Modal>
{/if}