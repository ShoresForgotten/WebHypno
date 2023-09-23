import { Color, colorEqual, colorToString, stringToColor } from "./color.js"
import { UserSetting, ColorSetting, NumberSetting, Renderer, Scene, ButtonSetting, DropdownSetting, StringSetting, SceneObject, Layer, FileSetting, ImagePreview } from "./graphics.js"
import { AppState, RendererState, RenderingState, StateChange } from "./main.js"

interface UIState {
    createUI(renderer: Renderer, scene: Scene): HTMLDivElement
}

const allowableDifference = 0.01

/**
 * Generate an element for user input on a user setting
 * @param setting - The setting to be controlled by the element
 * @returns An element containing the appropriate input type, or a div for connected settings
 */
function generateSettingsWidget(setting: UserSetting): HTMLElement {
    switch (setting.type) {
        case "number": {
            return generateNumberInputWidget(setting)
        }
        case "color": {
            return generateColorInputWidget(setting)
        }
        case "multi": {
            const element = document.createElement("div")
            element.classList.add("multi-setting")
            element.classList.add("setting")
            element.classList.add("setting-toplevel")
            setting.settings.forEach((setting) => {
                const widget = generateSettingsWidget(setting)
                widget.classList.remove("setting-toplevel")
                element.appendChild(widget)
            })
            return element
        }
        case "button": {
            return generateButtonInputWidget(setting)
        }
        case "dropdown": {
            return generateDropdownInputWidget(setting)
        }
        case "string": {
            return generateStringInputWidget(setting)
        }
        case "file": {
            return generateFileInputWidget(setting)
        }
        case "imagePreview": {
            return generateImagePreviewWidget(setting)
        }
    }
}

/**
 * Generate an element for a number setting
 * @param setting - The setting to be controlled by the element
 * @returns An Input elment of type number
 */
function generateNumberInputWidget(setting: NumberSetting): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    const input = document.createElement("input")
    input.type = "number"
    input.placeholder = setting.name
    if (setting.min != null) input.min = setting.min.toString()
    if (setting.max != null) input.max = setting.max.toString()
    if (setting.whole === false) input.step = "any"
    input.value = setting.value.toString()
    input.addEventListener("change", (event) => {
        const inputVal = input.valueAsNumber
        const callbackReturn = setting.set(inputVal)
        const diff = inputVal - callbackReturn
            if (Math.abs(diff) > allowableDifference) console.log(`Mismatch in input and returned value\nInput: ${inputVal}\nReturn: ${callbackReturn}`)
    })
    element.appendChild(title)
    element.appendChild(input)
    element.classList.add("setting")
    element.classList.add("number-setting")
    element.classList.add("setting-toplevel")
    return element
}

/**
 * Generate an input for color settings
 * Due to firefox on android only allowing a small palette for color inputs, if firefox on android is detected this will return a text box instead
 * @param setting - The setting to be controlled by the element
 * @returns Either an input element of type color or an input element of type text
 */
function generateColorInputWidget(setting: ColorSetting): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    const input = document.createElement("input")
    if (navigator.userAgent.includes("Firefox") && navigator.userAgent.includes("Android")) { // Firefox android doesn't fully support color input widgets
        input.type = "text"
        input.placeholder = setting.name
        input.addEventListener("change", (event) => {
            const inputVal = stringToColor(input.value)
            const callbackReturn = setting.set(inputVal)
            if (!colorEqual(inputVal, callbackReturn)) console.log(`Mismatch in input and returned value\nInput: ${inputVal}\nReturn: ${callbackReturn}`)
        })
        input.pattern = /\#?[a-fA-F0-9]{6}/.source
    }
    else {
        input.type = "color"
        //element.placeholder = setting.name // How to do this in a color input element
        input.value = '#' + colorToString(setting.value)
        input.addEventListener("change", (event) => {
            const inputVal = stringToColor(input.value)
            const callbackReturn = setting.set(inputVal)
            if (!colorEqual(inputVal, callbackReturn)) console.log(`Mismatch in input and returned value\nInput: ${inputVal}\nReturn: ${callbackReturn}`)
        })
    }
    element.appendChild(title)
    element.appendChild(input)
    element.classList.add("setting")
    element.classList.add("number-setting")
    element.classList.add("setting-toplevel")
    return element
}

function generateButtonInputWidget(setting: ButtonSetting): HTMLDivElement {
    const element = document.createElement("div")
    const button = document.createElement("button")
    button.textContent = setting.name
    button.addEventListener("click", () => {
        setting.push()
    })
    element.appendChild(button)
    element.classList.add("setting")
    element.classList.add("button-setting")
    element.classList.add("setting-toplevel")
    return element
}

function generateDropdownInputWidget(setting: DropdownSetting): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    const select = document.createElement("select")
    setting.options.forEach((item) => {
        const elem = document.createElement("option")
        if (item === setting.active) {
            elem.selected = true
        }
        elem.value = item
        elem.text = item // todo: make this title case
        select.add(elem)
    })
    select.addEventListener("change", (event) => {
        const input = select.value
        const callbackReturn = setting.set(input)
        if (input !== callbackReturn) console.log(`Mismatch in input and returned values\nInput: ${input}\nReturn: ${callbackReturn}`)
    })
    element.appendChild(title)
    element.appendChild(select)
    element.classList.add("setting")
    element.classList.add("dropdown-setting")
    element.classList.add("setting-toplevel")
    return element
}

function generateStringInputWidget(setting: StringSetting): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    const input = document.createElement("input")
    input.type = "text"
    input.value = setting.value
    input.addEventListener("change", (event) => {
        const inputVal = input.value
        const callbackReturn = setting.set(inputVal)
        if (inputVal !== callbackReturn) console.log(`Mismatch in input and returned values\nInput: ${input}\nReturn: ${callbackReturn}`)
    })
    element.appendChild(title)
    element.appendChild(input)
    element.classList.add("setting")
    element.classList.add("string-setting")
    element.classList.add("setting-toplevel")
    return element
}

function generateFileInputWidget(setting: FileSetting): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    const input = document.createElement("input")
    input.type = "file"
    input.accept = setting.accept.toString()
    input.multiple = setting.multiple
    if (setting.path !== "") input.value = setting.path
    input.addEventListener("change", (event) => {
        const inputVal = input.files
        if (inputVal) {
            setting.set(inputVal)
        }
    })
    element.appendChild(title)
    element.append(input)
    element.classList.add("setting")
    element.classList.add("file-setting")
    element.classList.add("setting-toplevel")
    return element
}

function generateImagePreviewWidget(setting: ImagePreview): HTMLDivElement {
    const element = document.createElement("div")
    const title = document.createElement("p")
    title.textContent = setting.name
    title.classList.add("setting-name")
    element.appendChild(title)
    if (setting.elem) {
        element.append(setting.elem)
    }
    element.classList.add("setting")
    element.classList.add("image-preview")
    element.classList.add("setting-toplevel")
    return element
}

/**
 * Create and return a div with input elements for everything to do with the background animation
 * @param state - The app state to create the UI from
 * @param stateChange - What to do on a change in app state
 * @returns A div containing the settings menu
 */
export function createSettingsUI(state: AppState, stateChange: (change: StateChange) => void): HTMLElement[] {
    const layerSelector = document.createElement("select")
    layerSelector.classList.add("ui-mode-selector")
    const layerList: Layer[] = ["background", "text", "image"]
    layerList.forEach((layer) => {
        const option = document.createElement("option")
        if (layer === state.activeUI) option.selected = true
        option.value = layer
        option.text = layer // todo: make this title case
        layerSelector.add(option)
    })
    layerSelector.addEventListener("change", () => {
        if (layerSelector.value === "text" || layerSelector.value === "background" || layerSelector.value == "image") {
            stateChange({type: "layer", layer: layerSelector.value})
        }
        else {
            console.error("i'm so tired")
        }
    })
    switch (state.activeUI) {
        case "background": {
            const bgroundState = state.backgroundRendererState
            const renderSelector = createRenderSelector(Array.from(bgroundState.availableRenderers.values()), bgroundState.activeRenderer.renderer, (renderer: string) => stateChange({type: "renderer", newRenderer: renderer, layer: state.activeUI}))
            const sceneSelector = createSceneSelector(bgroundState.activeRenderer.renderer.getScenes(), bgroundState.activeRenderer.activeScene.scene, state.debug, (scene: number) => stateChange({type: "scene", newScene: scene, layer: state.activeUI}))
            const objects = bgroundState.activeRenderer.activeScene.scene.getObjects()
            let activeObject = objects.find((obj) => {
                return obj.id === bgroundState.activeRenderer.activeScene.selectedObject.id
            })
            if (typeof activeObject === "undefined") activeObject = objects[0]
            const objectSelector = createObjectSelector(objects, activeObject, state.debug, (object) => stateChange({type: "object", newObject: object, layer: state.activeUI}))
            const settingsArea = createObjectSettings(activeObject) // todo: this needs improvement
            return [layerSelector, renderSelector, sceneSelector, objectSelector, settingsArea]
        }
        case "text": {
            const textState = state.textRendererState
            const renderSelector = createRenderSelector(Array.from(textState.availableRenderers.values()), textState.activeRenderer.renderer, (renderer: string) => stateChange({type: "renderer", newRenderer: renderer, layer: state.activeUI}))
            const sceneSelector = createSceneSelector(textState.activeRenderer.renderer.getScenes(), textState.activeRenderer.activeScene.scene, state.debug, (scene: number) => stateChange({type: "scene", newScene: scene, layer: state.activeUI}))
            const objects = textState.activeRenderer.activeScene.scene.getObjects()
            let activeObject = objects.find((obj) => {
                return obj.id === textState.activeRenderer.activeScene.selectedObject.id
            })
            if (typeof activeObject === "undefined") activeObject = objects[0]
            const objectSelector = createObjectSelector(objects, activeObject, state.debug, (object) => stateChange({type: "object", newObject: object, layer: state.activeUI}))
            const settingsArea = createObjectSettings(activeObject) // todo: this needs improvement
            return [layerSelector, renderSelector, sceneSelector, objectSelector, settingsArea]
        }
        case "image": {
            const imageState = state.imageRendererState
            const renderSelector = createRenderSelector(Array.from(imageState.availableRenderers.values()), imageState.activeRenderer.renderer, (renderer: string) => stateChange({type: "renderer", newRenderer: renderer, layer: state.activeUI}))
            const sceneSelector = createSceneSelector(imageState.activeRenderer.renderer.getScenes(), imageState.activeRenderer.activeScene.scene, state.debug, (scene: number) => stateChange({type: "scene", newScene: scene, layer: state.activeUI}))
            const objects = imageState.activeRenderer.activeScene.scene.getObjects()
            let activeObject = objects.find((obj) => {
                return obj.id === imageState.activeRenderer.activeScene.selectedObject.id
            })
            if (typeof activeObject === "undefined") activeObject = objects[0]
            const objectSelector = createObjectSelector(objects, activeObject, state.debug, (object) => stateChange({type: "object", newObject: object, layer: state.activeUI}))
            const settingsArea = createObjectSettings(activeObject) // todo: this needs improvement
            return [layerSelector, renderSelector, sceneSelector, objectSelector, settingsArea]
        }
    }
}

/**
 * Create a selection element for selecting which renderer to use
 * @param renderers - A map of renderers and names. Names displayed to user.
 * @param activeRenderer - The currently active renderer
 * @param onChange - What do do on change
 * @returns A select element
 */
function createRenderSelector(rendererKeys: RendererState[], activeRenderer: Renderer, onChange: (newSelection: string) => void): HTMLSelectElement {
    const selector = document.createElement("select")
    selector.classList.add("renderer-selector")
    rendererKeys.forEach((val) => {
        const option = document.createElement("option")
        option.text = val.renderer.name
        option.value = val.renderer.name
        if (val.renderer.name === activeRenderer.name) {option.defaultSelected = true; option.selected = true}
        selector.add(option)
    })
    selector.addEventListener("change", ((_event) => {
        onChange(selector.value)
    }))
    return selector
}

/**
 * Create a selection element for selecting which scene to display
 * @param scenes - Scenes to select from
 * @param activeScene - The currently active scene
 * @param onChange - What do do on change
 * @returns A select element
 */
function createSceneSelector(scenes: Map<number, Scene>, activeScene: Scene, debug: boolean, onChange: (newSelection: number) => void): HTMLSelectElement {
    const selector = document.createElement("select")
    const sortedScenes = Array.from(scenes).sort((a, b) => {return a[0] - b[0]})
    selector.classList.add("scene-selector")
    sortedScenes.forEach(([id, scene]) => {
        if (!scene.debug || debug) {
            const option = document.createElement("option")
            option.text = scene.name
            option.value = id.toString()
            if (scene === activeScene) {
                option.defaultSelected = true
                option.selected = true
            }
            selector.add(option)
        }
    })
    selector.addEventListener("change", ((_event) => {
        const key = Number.parseInt(selector.value)
        onChange(key)
    }))
    return selector
}

function createObjectSelector(objects: SceneObject[], activeObject: SceneObject, debug: boolean, onChange: (newSelection: SceneObject) => void): HTMLSelectElement {
    const selector = document.createElement("select")
    selector.classList.add("object-selector")
    objects.forEach((obj) => {
        const option = document.createElement("option")
        if (obj.name === "") {
            option.text = "<empty>"
        }
        else {
            option.text = obj.name
        }
        option.value = obj.id.toString()
        if (obj.id === activeObject.id) {
            option.selected = true
        }
        selector.add(option)
    })
    selector.addEventListener("change", (event) => {
        const key = Number.parseInt(selector.value)
        const objects2 = objects.filter((x) => {
            if (x.id === key) { return true }
            else { return false }
        })
        if (objects2.length === 1) {
            onChange(objects2[0])
        }
        else {
            console.error("Matching list of objects was not of length 1")
        }
    })
    return selector
}

/**
 * Creates a div containing all the settings for the currently active scene
 * @param settings - A hashmap of object names mapping to lists of settings for those objects
 * @returns A div element
 */
function createSceneSettings(settings: Map<string, UserSetting[]>): HTMLDivElement {
    const div = document.createElement("div")
    div.classList.add("scene-settings")
    settings.forEach((object) => {
        object.forEach((setting) => {
        let element = generateSettingsWidget(setting)
        div.appendChild(element)
        })
    })
    return div
}

function createObjectSettings(object: SceneObject): HTMLDivElement {
    const div = document.createElement("div")
    div.classList.add("object-settings")
    object.settings.forEach((obj) => {
        const element = generateSettingsWidget(obj)
        div.appendChild(element)
    })
    return div
}