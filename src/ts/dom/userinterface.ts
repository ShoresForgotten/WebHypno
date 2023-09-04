import { Color, colorToString, stringToColor } from "./color.js"
import { UserSetting, ColorSetting, NumberSetting, Renderer, Scene } from "./graphics.js"

interface UIState {
    createUI(renderer: Renderer, scene: Scene): HTMLDivElement
}

function generateSettingsWidget(setting: UserSetting): HTMLElement {
    switch (setting.type) {
        case "number": {
            return generateNumberInputWidget(setting)
        }
        case "color": {
            return generateColorInputWidget(setting)
        }
        case "multi": {
            let element = new HTMLDivElement()
            element.classList.add("multisetting")
            setting.settings.forEach((setting) => {
                element.appendChild(generateSettingsWidget(setting))
            })
            return element
        }
    }
}

function generateNumberInputWidget(setting: NumberSetting): HTMLInputElement {
    let element = new HTMLInputElement()
    element.type = "number"
    element.placeholder = setting.name
    if (setting.min != null) element.min = setting.min.toString()
    if (setting.max != null) element.max = setting.max.toString()
    if (setting.whole === false) element.step = "any"
    element.value = setting.value.toString()
    element.addEventListener("change", (event) => {
        const input = element.valueAsNumber
        const callbackReturn = setting.callback(input)
        if (input != callbackReturn) alert("huh")
        setting.value = callbackReturn
    })
    return element
}

function generateColorInputWidget(setting: ColorSetting): HTMLInputElement {
    let element = new HTMLInputElement()
    if (navigator.userAgent.includes("Firefox") && navigator.userAgent.includes("Android")) { // Firefox android doesn't fully support color input widgets
        element.type = "text"
        element.placeholder = setting.name
        element.value = colorToString(setting.value)
        element.addEventListener("change", (event) => {
            const input = stringToColor(element.value)
            const callbackReturn = setting.callback(input)
            if (input != callbackReturn) alert("eh?")
        })
        element.pattern = /\#?[a-fA-F0-9]{6}/.source
    }
    else {
        element.type = "color"
        //element.placeholder = setting.name // How to do this in a color input element
        element.value = '#' + colorToString(setting.value)
        element.addEventListener("change", (event) => {
            const input = stringToColor(element.value)
            const callbackReturn = setting.callback(input)
            if (input != callbackReturn) alert("what.")
            setting.value = callbackReturn
        })
    }
    return element
}
/*
function createSettingsUI(renderers: Map<string, Renderer>, init: [Renderer, Scene]): HTMLDivElement {
    const element = document.createElement("div")
    const renderSelector = createRenderSelector(renderers, init[0])
    let sceneSelector = createSceneSelector(init[0].getScenes(), init[1])
    let settingsArea = createSceneSettings(init[1].getSettings())
}

function createRenderSelector(renderers: Map<string, Renderer>, init: Renderer): HTMLSelectElement {
    const selector = document.createElement("select")
    renderers.forEach((val, key) => {
        const option = document.createElement("option")
        option.text = key
        if (val === init) {option.defaultSelected = true; option.selected = true}
        selector.add(option)
    })
    return selector
}

function createSceneSelector(scenes: Set<Scene>, initScene: Scene): HTMLSelectElement {
    const selector = document.createElement("select")
    scenes.forEach((val) => {
        const option = document.createElement("option")
        option.text = val.name
        if (val === initScene) {option.defaultSelected = true; option.selected = true}
        selector.add(option)
    })
    return selector
}

function createSceneSettings(settings: UserSetting[]): HTMLDivElement {
    const div = document.createElement("div")
    while (div.firstChild) {
        div.removeChild(div.firstChild)
    }
    settings.forEach((setting) => {
        let element = generateSettingsWidget(setting)
        div.appendChild(element)
    })
    return div
}

interface UIController {
    activeRenderer: Renderer
    activeScene: Scene
    activeObject: UserSetting[]
    redraw: boolean
    createUI(): HTMLDivElement
}

function createUIController(renderers: Map<string, Renderer>, renderer: Renderer, scene: Scene, object: UserSetting[]): UIController {
    let lastRenderer = renderer
    let lastScene = scene
    let lastObject = object
    return {
        activeRenderer: renderer,
        activeScene: scene,
        activeObject: object,
        createUI: () => {
            const elem = document.createElement("div")
            const rendererSelector = createRenderSelector(renderers, renderer)
            const renderChange = (newRenderer: Renderer) => {
                this.activeRenderer
            }
            rendererSelector.addEventListener("change", (event) => {
                
            })

        }
}
}
*/