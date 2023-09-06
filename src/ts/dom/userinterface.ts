import { Color, colorToString, stringToColor } from "./color.js"
import { UserSetting, ColorSetting, NumberSetting, Renderer, Scene } from "./graphics.js"
import { AppState, StateChange } from "./main.js"

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
            let element = document.createElement("div")
            element.classList.add("multisetting")
            setting.settings.forEach((setting) => {
                element.appendChild(generateSettingsWidget(setting))
            })
            return element
        }
    }
}

/**
 * Generate an element for a number setting
 * @param setting - The setting to be controlled by the element
 * @returns An Input elment of type number
 */
function generateNumberInputWidget(setting: NumberSetting): HTMLInputElement {
    let element = document.createElement("input")
    element.type = "number"
    element.placeholder = setting.name
    if (setting.min != null) element.min = setting.min.toString()
    if (setting.max != null) element.max = setting.max.toString()
    if (setting.whole === false) element.step = "any"
    element.value = setting.value.toString()
    element.addEventListener("change", (event) => {
        const input = element.valueAsNumber
        const callbackReturn = setting.set(input)
        const diff = input - callbackReturn
            if (Math.abs(diff) > allowableDifference) console.log(`Mismatch in input and returned value\nInput: ${input}\nReturn: ${callbackReturn}`)
    })
    return element
}

/**
 * Generate an input for color settings
 * Due to firefox on android only allowing a small palette for color inputs, if firefox on android is detected this will return a text box instead
 * @param setting - The setting to be controlled by the element
 * @returns Either an input element of type color or an input element of type text
 */
function generateColorInputWidget(setting: ColorSetting): HTMLInputElement {
    let element = document.createElement("input")
    if (navigator.userAgent.includes("Firefox") && navigator.userAgent.includes("Android")) { // Firefox android doesn't fully support color input widgets
        element.type = "text"
        element.placeholder = setting.name
        element.addEventListener("change", (event) => {
            const input = stringToColor(element.value)
            const callbackReturn = setting.set(input)
            if (input != callbackReturn) console.log(`Mismatch in input and returned value\nInput: ${input}\nReturn: ${callbackReturn}`)
        })
        element.pattern = /\#?[a-fA-F0-9]{6}/.source
    }
    else {
        element.type = "color"
        //element.placeholder = setting.name // How to do this in a color input element
        element.value = '#' + colorToString(setting.value)
        element.addEventListener("change", (event) => {
            const input = stringToColor(element.value)
            const callbackReturn = setting.set(input)
            if (input != callbackReturn) console.log(`Mismatch in input and returned value\nInput: ${input}\nReturn: ${callbackReturn}`)
        })
    }
    return element
}

/**
 * Create and return an element with elements for every user settable settings
 * @param state - The app state to create the UI from
 * @param stateChange - What to do on a change in app state
 * @returns A div containing the settings menu
 */
export function createSettingsUI(state: AppState, stateChange: (change: StateChange) => void): HTMLDivElement {
    const element = document.createElement("div")
    const renderSelector = createRenderSelector(state.availableRenderers, state.activeRenderer, (renderer) => stateChange({type: "renderer", newRenderer: renderer}))
    const sceneSelector = createSceneSelector(state.activeRenderer.getScenes(), state.activeScene, (scene) => stateChange({type: "scene", newScene: scene}))
    const settingsArea = createSceneSettings(state.activeScene.getSettings())
    element.appendChild(renderSelector)
    element.appendChild(sceneSelector)
    element.appendChild(settingsArea)
    return element
}

/**
 * Create a selection element for selecting which renderer to use
 * @param renderers - A map of renderers and names. Names displayed to user.
 * @param activeRenderer - The currently active renderer
 * @param onChange - What do do on change
 * @returns A select element
 */
function createRenderSelector(renderers: Map<string, Renderer>, activeRenderer: Renderer, onChange: (newSelection: Renderer) => void): HTMLSelectElement {
    const selector = document.createElement("select")
    selector.classList.add("renderer-selector")
    renderers.forEach((val, key) => {
        const option = document.createElement("option")
        option.text = key
        if (val === activeRenderer) {option.defaultSelected = true; option.selected = true}
        selector.add(option)
    })
    selector.addEventListener("change", ((_event) => {
        const key = selector.value
        const val = renderers.get(key)
        if (typeof val === "undefined") {
            console.error("Tried to select a renderer which does not exist in the renderer hashmap")
        }
        else {
            onChange(val)
        }
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
function createSceneSelector(scenes: Map<string, Scene>, activeScene: Scene, onChange: (newSelection: Scene) => void): HTMLSelectElement {
    const selector = document.createElement("select")
    selector.classList.add("scene-selector")
    scenes.forEach((val, key) => {
        const option = document.createElement("option")
        option.text = val.name
        option.value = key
        if (val === activeScene) {option.defaultSelected = true; option.selected = true}
        selector.add(option)
    })
    selector.addEventListener("change", ((_event) => {
        const key = selector.value
        const scene = scenes.get(key)
        if (typeof scene === "undefined") {
            console.error("Tried to select a scene which does not exist in the scene hashmap")
        }
        else {
            onChange(scene)
        }
    }))
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
