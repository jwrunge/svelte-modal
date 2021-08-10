# Easy Modal
This is an ***easy*** modal, written in [Svelte](https://svelte.dev/) but usable not just as a Svelte component, but in vanilla JavaScript (or any other framework you may be using, because Svelte is magic). It is intended to be:
* Quick to implement
* Highly customizable
* Easily stylable with a minimum of CSS
* Fun to play with

Check out [the CodePen example for non-Svelte implementations](https://codepen.io/jwrunge/pen/wvdvVOa) and [the Svelte REPL for Svelte implementations](https://svelte.dev/repl/60b0d85b93894037b2efdd5753914ec9?version=3.38.3) for examples of how to implement Easy Modal!

## Contents
1. [Development][1]
2. [Installation][2]
3. [Implementation][3]
4. [Customization][4]
5. [Styling][5]

## Development
Author: Jacob Runge

* Check out my website, [JacobRunge.com](jacobrunge.com)
* See the code on [GitHub](https://github.com/jwrunge/svelte-modal)
* Get the Node package via [NPM](https://www.npmjs.com/package/@jwrunge/modal)

### Why no web module?
[Svelte](https://svelte.dev/) is a fantastic and flexible tool that compiles to vanilla JavaScript, and can even compile to web modules. However, at this time, web module compilation comes with some trade-offs that will make the code more difficult to maintain. The exported component function works great in vanilla JS, though!

### Support the developer!
This code is provided under the MIT license, and is completely free to use and modify in any personal or commercial projects--just because I like you! If you are using this code in an application that is making you money, or even if you just think it's super neat and want to support me as a developer, consider a small tip at the "Buy me a coffee!" link below. It's much appreciated! :-)

<a href="https://www.buymeacoffee.com/jwrunge" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

## Installation
### The JavaScript
Install via NPM: `npm install @jwrunge/svelte-modal`

Or include via script: `<script src="path/to/modal.js">`

### The CSS
I recommend including the foundation stylesheet as well, unless it significantly breaks your design. The foundation stylesheet is meant to be very minimal, allowing you quite a bit of control over the look and feel of your modals. See ["Styling"](#styling) below for more information.

With an NPM installation, the stylesheet can be found in the node_modules directory: `<link rel='stylesheet' href='node_modules/@jwrunge/modal/dist/modalstyle.css'>`

### Direct links
Download local copies of the code here:
* GitHub JavaScript file: [modal.js](https://github.com/jwrunge/svelte-modal/blob/main/dist/modal.js)
* GitHub CSS file: [modalstyle.css](https://github.com/jwrunge/svelte-modal/blob/main/dist/modalstyle.css)
* GitHub Svelte file: [Modal.svelte](https://github.com/jwrunge/svelte-modal/blob/main/dist/Modal.svelte)

## Implementation
There are two ways to implement the modal:
* [Including in non-Svelte applications][6]
* [Including in your Svelte application][7]

### Non-Svelte implementation
#### Implementation using Node.js
Import the script. The modal assumes it will be compiled by a build system such as webpack or rollup.
```
import modal from '@jwrunge/modal'
```

You can now create a modal instance using `new modal()` -- see ["Instantiating"](#instantiating) below).

#### Implementation using `<script>`
Include the modal via `<script>` tag:
```
<script src="node_modules/@jwrunge/modal/dist/modal.js">
```

You can use the path to `modal.js` in your `node_modules` folder or a local downloaded copy.

You can now create a modal instance using `new modal()` -- see ["Instantiating"](#instantiating) below).

#### Instantiating
However you include the modal script, the following details basic usage:
```
const myModal = new modal({
    target: document.getElementById('myElement'),
    props: {
        closable: true,
        closepos: "modal-closer-right",
        content: "<p>This is my modal!</p>"
    }
})
```

This method uses [Svelte's client-side component API](https://svelte.dev/docs#Client-side_component_API), and you can refer to the API documentation for advanced use. In a nutshell, the `new modal()` method can take the following options:

|option     |default    |description|
|---        |---        |---|
|target     |none       |The HTML element to render to. **required**|
|props      |{}         |You can initialize modal customization properties here (properties listed in [Customization](#customization))|
|intro      |false      |Whether or not to play the modal's appearance animation, if the modal is started in an enabled state|

Customization properties can be set dynamically using `myModal.$set()`:
```
myModal.$set({
    closable: false,
    loading: true
})
```

#### Opening and closing the modal
To make the modal visible (open), set the customization property `visible` equal to `true`: `myModal.$set({ visible: true })`. Of course, the modal can be made invisible (closed) by setting the `visible` property to `false`. Changing this property isn't necessary when implementing the modal as a Svelte component.

The modal emits a single event, `close`, called when the user clicks the `x` close button or, if enabled, the background. To bind to this event, call the `myModal.$on()` function and pass "close" as the first argument:
```
myModal.$on("close", function(){
    myModal.$set({ visible: false })
})
```

#### Setting modal content
Setting the modal's content is as easy as passing in a customization property to the `props` option, either during initialization or by using `myModal.$set({ content: "My content" })`.

#### Destroying the modal
You can destroy the modal instance, too, if you want... `myModal.$destroy()`

### Svelte implementation
Start by including the Svelte source file in your Svelte application: `import Modal from '@jwrunge/dist/Modal.svelte'`

If you are a Svelte developer, you probably already know how Svelte components work. Once imported, you can pass or bind any props (listed in [Customization](#customization)) and connect functions to the `close` event using `on:close={yourFunction}`. See the example below.

Note that the `visible` prop was meant for non-Svelte developers as an easy way to open and close the modal, and the `content` and `heading` props circumvent non-Svelte developers' inablity to use component slots. You can use them, but it may be easier to open and close the modal using reactive variables and to pass content to the modal via the slot, like so:
```
let openModal = ""

{#if openModal == "cool modal"}
    <Modal closable={true}>
        <h2>Cool modal, bruh!</h2>
        <p>It's really the coolest modal ever.</p>
        <button on:click={()=> { openModal = "" }}>Close it!</button>
    </Modal>
{/if}
```

## Customization
The following customization properties can be passed as props to the modal. Some of these allow for quick styling of the modal without the need to use CSS, and I have seperated transition- and style-related props into seperate tables. Modal style can be easily modified using CSS--see ["Styling"](#styling) below.

### Loading and closing customization
|prop           |default                |description    |
|---            |---                    |---            |
|visible        |true                   |Intended for non-Svelte implementations. Sets whether the modal is visible (open) or invisible (closed).|
|content        |""                     |Intended for non-Svelte implementations. Sets the content of the modal.|
|heading        |""                     |Intended for non-Svelte implementations. Sets the heading of the modal.|
|buttons        |[]                     |Intended primarily for non-Svelte implementations, where adding a button via the `content` prop may be difficulty. `buttons` takes an array of objects with the format `{text: "", class: "", event: ""}`, where `text` is the button text, `class` is a string list of classes that you want to apply to the button (for styling), and `event` is the name of an event the button will emit on click (which you can handle with `myModal.$on()`).|
|closable       |true                   |Sets whether or not the modal can be closed. If it can, and the modal is not in a loading state, an 'x' icon will appear. Clicking the 'x' icon will emit a `close` event.|
|bgclose        |false                  |Sets whether or not the modal will close if you click or tap on the darkened background. Modal must be set to `closable` and not in a loading state.|
|closepos       |"modal-closer-right"   |Sets the position of the close icon. Can be "modal-closer-right" to position at the top-right, or "modal-closer-left" to position at the top-left.|
|loading        |false                  |Sets the modal in a loading state when `true`. In a loading state, a loading icon or loading text will appear, the close icon will disappear, and the modal content may optionally dim.|
|fadeonload     |false                  |If the modal is in a loading state, setting this value to `true` will make the modal content semi-transparent.|
|loadiconpath   |"/icons/loading.svg"   |Sets a path to your loading icon. Can be overridden with loadingtext.|
|loadiconwidth  |"4rem"                 |The width of the specified loading icon (a CSS value)|
|loadpos        |"modal-load-top-right" |Sets the position of the loading icon or text. Can be "modal-load-top-right," "...-top-left", "...-bottom-right", "...-bottom-left," or "...-middle". Middle will render the loading icon in a relative-positioned div, which will take up space in the modal; all other settings will use absolute positioning.|
|loadingtext    |""                     |If set, loadingtext will override and replace the loading icon.|

### Transition customization
Note: transitions refer to Svelte's built-in transitions, listed [here](https://svelte.dev/docs#svelte_transition). No additional script imports are required to use these transitions in the modal.

|prop           |default                |description    |
|---            |---                    |---            |
|transbg        |"fade"                 |The transitional animation of the modal background. Can be "fade", "scale", "fly", or "slide".|
|transbgInOptions|{duration:200}        |Options to customize the intro background transition. Use Svelte's transition options [defined here](https://svelte.dev/docs#svelte_transition).|
|transbgOutOptions|{duration:200}        |Options to customize the outro background transition. Use Svelte's transition options [defined here](https://svelte.dev/docs#svelte_transition).|
|transinner     |"scale"                |The transitional animation of the inner modal. Can be "fade", "scale", "fly", or "slide".|
|transinnerInOptions|{duration:200}        |Options to customize the intro inner modal transition. Use Svelte's transition options [defined here](https://svelte.dev/docs#svelte_transition).|
|transinnerOutOptions|{duration:200}        |Options to customize the outro inner modal transition. Use Svelte's transition options [defined here](https://svelte.dev/docs#svelte_transition).|

### Appearance customization
All of these style properties can be set through CSS, too--see ["Styling"](#styling) below.

|prop           |default                |description    |
|---            |---                    |---            |
|bgcolor        |"rgba(0,0,0,.7)"       |The background color of the modal background, formatted as a CSS color.|
|innerbg        |"white"                |The background color of the inner modal, formatted as a CSS color.|
|wide           |false                  |Widens the modal to a maximum of `60rem`; good for more in-depth or interactive modals.|
|fullwidth      |false                  |Widens the modal to a full width of 95% of the window. Overrides `wide`.|
|zindex         |25                     |The z-index of the modal (makes sure the modal stays on top of your other content).|
|borderradius   |"5px"                  |Rounds the borders of the inner modal.|
|topoffset      |"0"                    |Moves the inner modal relative to itself; formatted in CSS units. For example, to move the inner modal up from the center of the screen, you can use `topoffset: "-5rem"`.|

## Styling
Additional custom styling is super easy, and can be done in standard CSS in your page. Here are the relevant classes:

|class                  |element                |
|---                    |---                    |
|.modal                 |The container `div`; the same element as `.modal-backgrop`.|
|.modal-backdrop        |The modal background. A `flexbox`. Contains all other elements.|
|.modal-inner           |The inner modal div. A simple, relatively-positioned `div`.|
|.modal-scroller        |The scrollable content `div` for overflow modal content.|
|.buttons               |The `div` container of any buttons passed via the `buttons` prop.|
|.modal-closer          |The close icon. Absolutely-positioned.|
|.modal-load-icon       |The loading icon or text. Absolutely-positioned, unless `loadpos` is set to `modal-load-middle`.|
|.modal-faded           |Content that is faded when the modal is in a loading state, if `fadeonload` is set.|

This is *not* an exaustive list of all modal classes; those can be discovered and manipulated via the developer inspector in your browser if you need deeper customizations for your particular use case.

[1]: #development
[2]: #installation
[3]: #implementation
[4]: #customization
[5]: #styling
[6]: #non-svelte-implementation
[7]: #svelte-implementation