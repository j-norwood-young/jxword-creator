<script>
// Svelte dispatch
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

export let file_formats = [".xd"];

let fileInput;

function handleFileSelect() {
    const reader = new FileReader();
    reader.onload = (function() {
        return async function(e) {
            try {
                const data = {
                    filename: fileInput.files[0].name,
                    content: e.target.result
                }
                dispatch("upload", data);
            } catch(err) {
                console.error(err);
                throw "Unable to upload file";
            }
        };
    })(fileInput.files[0]);
    // Read in the image file as a data URL.
    reader.readAsText(fileInput.files[0]);
}
</script>

<input class="drop_zone" type="file" id="file" name="files" accept="{() => file_formats.join(",")}" bind:this={fileInput} on:change={handleFileSelect} />