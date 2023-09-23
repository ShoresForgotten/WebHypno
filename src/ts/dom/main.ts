import { createImageRenderer } from "./2d/image.js"
import { createTextRenderer } from "./2d/text.js"
import { Index, Layer, Renderer, Scene, SceneObject } from "./graphics.js"
import { createSettingsUI } from "./userinterface.js"
import { createRenderer as createGLRenderer }  from "./webgl/state.js"

/**
 * Get the index of shader info locations
 * @param url - The url of the index json
 * @returns A promise for the index
 */
async function getIndex(url: string): Promise<Index> {
    return fetch(url)
        .then((response) => {
            if (response.ok) {
                return response
            }
            else throw new Error("Error while reading shader index: " + response.statusText)
        })
        .then((response) => response.json())
        .then((json: any) => {
            if ("webgl" in json) {
                const map = new Map<number, string>
                json.webgl.forEach((obj: any) => {
                    map.set(obj.id, obj.file)
                })
                return {webgl: map}
            }
            else throw new Error("Error while reading shader index")
        })
}

/**
 * Create a canvas and OpenGL context
 * @returns Either a tuple of a canvas and context or null (null means no opengl context is available)
 */
function createGLContext(): [HTMLCanvasElement, WebGLRenderingContext] | null {
    try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("webgl")
        if (ctx instanceof WebGLRenderingContext) return [canvas, ctx]
        else return null
    }
    catch (err) {
        console.error(err)
        return null
    }
}

function create2DContext(): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
    try {
        const canvas = document.createElement("canvas")
        canvas.height = screen.availHeight
        canvas.width = screen.availWidth
        const ctx = canvas.getContext("2d")
        if (ctx instanceof CanvasRenderingContext2D) return [canvas, ctx]
        else return null
    }
    catch (err) {
        console.error(err)
        return null
    }
}

/**
 * Entry point
 */
async function init(): Promise<void> {
    // Content warning
    const warning = document.getElementById("warning")
    const skip = localStorage.getItem("skipWarning")
    if (!(skip && skip === "true") && warning) {
        warning.hidden = false
        document.getElementById("pass-gate")?.addEventListener("click", () => {
            const checkbox: HTMLElement | null = document.getElementById("remember-warning")
            if (checkbox && checkbox instanceof HTMLInputElement && checkbox.checked) {
                localStorage.setItem("skipWarning", "true")
            }
            warning.hidden = true
        })
    }

    // WebGL
    const indexLocation = "/shaders/index.json"
    const indexPromise = getIndex(indexLocation)
    const uiHider = document.getElementById("ui-hider")
    const availableBackgroundRenderers = new Map<string, Renderer>()
    const glContext = createGLContext()
    const stateUpdateQueue: StateChange[] = []
    let glRenderer: [Renderer, Scene]
    if (glContext != null) {
        glContext[0].id = "webgl-renderer"
        glContext[0].classList.add("renderer")
        glContext[0].classList.add("background-renderer")
        glRenderer = await createGLRenderer(glContext[1], 1, (await indexPromise).webgl, (stateChange) => {stateUpdateQueue.push(stateChange)})
        availableBackgroundRenderers.set("webgl", glRenderer[0])
    }
    else {
        throw new Error("fuck")
    }

    // Text
    const textContext = create2DContext()
    let textRenderer: [Renderer, Scene]
    if (textContext !== null) {
        textContext[0].id = "text-2d-renderer"
        textContext[0].classList.add("renderer")
        textContext[0].classList.add("text-renderer")
        textRenderer = createTextRenderer(textContext[1], (stateChange) => {stateUpdateQueue.push(stateChange)})
    }
    else {
        throw new Error("shit")
    }
    
    // Images
    const imageContext = create2DContext()
    let imageRenderer: [Renderer, Scene]
    if (imageContext !== null) {
        imageContext[0].id = "image-2d-renderer"
        imageContext[0].classList.add("renderer")
        imageContext[0].classList.add("image-renderer")
        imageRenderer = createImageRenderer(imageContext[1], (stateChange) => {stateUpdateQueue.push(stateChange)})
    }
    else {
        throw new Error("cunt")
    }

    // State
    const state: AppState = {
        activeUI: "background",
        backgroundRendererState: buildRenderingState(availableBackgroundRenderers, glRenderer[0], glRenderer[1], glRenderer[1].getObjects()[0]),
        imageRendererState: buildRenderingState((new Map<string, Renderer>([["image", imageRenderer[0]]])), imageRenderer[0], imageRenderer[1], imageRenderer[1].getObjects()[0]),
        textRendererState: buildRenderingState((new Map<string, Renderer>([["text", textRenderer[0]]])), textRenderer[0], textRenderer[1], textRenderer[1].getObjects()[0]),
        uiVisible: false,
        debug: true
    }

    // UI
    const settingsConainer = document.getElementById("ui")
    const stateChange = (change: StateChange) => {
        changeState(state, change)
        if (settingsConainer) {
            settingsConainer.replaceChildren(...createSettingsUI(state, stateChange))
        }
    }

    // Main loop
    const renderLoop = (t: number) => {
        const nextQueue = stateUpdateQueue.pop()
        if (nextQueue) {
            stateChange(nextQueue)
        }
        resize(glRenderer[0])
        resize(imageRenderer[0])
        resize(textRenderer[0])
        state.backgroundRendererState.activeRenderer.activeScene.scene.draw(t)
        state.imageRendererState.activeRenderer.activeScene.scene.draw(t)
        state.textRendererState.activeRenderer.activeScene.scene.draw(t)
        requestAnimationFrame(renderLoop)
    }
    settingsConainer?.replaceChildren(...createSettingsUI(state, stateChange))
    document.body.appendChild(glContext[0])
    document.body.appendChild(textContext[0])
    document.body.appendChild(imageContext[0])
    const renderers = document.querySelectorAll(".renderer")
    if (uiHider) {
        renderers.forEach((renderer) => {
            if (renderer instanceof HTMLElement) {
                addShowUIFunctionality(renderer, () => {uiHider.hidden = false})
            }
        })
        document.getElementById("ui-close")?.addEventListener("click", () => {
            uiHider.hidden = true
        })
    }
    renderLoop(performance.now())
}

/**
 * Put the show UI listeners on the given canvas.
 * If the browser has no touchscreen, it's double click (900ms)
 * If the browser has a touchscreen, swiping down works too
 * @param canvas The canvas to attach the event listeners to
 * @param showUI What to do when the UI is to be shown
 */
function addShowUIFunctionality(canvas: HTMLElement, showUI: () => void) {
    if (navigator.maxTouchPoints > 0) {
        let start: Touch | null
        canvas.addEventListener("touchstart", (event) => {
            if (event.touches.length === 1) {
                start = event.touches.item(0)
            }
            else {
                start = null
            }
        })
        canvas.addEventListener("touchmove", (event) => {
            if (start) {
                console.log(start)
                let currentTouch = event.touches.item(0)
                if (currentTouch) {
                    if (currentTouch.clientY - start.clientY > (canvas.clientHeight * 0.25)) {
                        showUI()
                    }
                }
            }
        })
    }
    let lastClick = performance.now() - 900 // Put it in the past so one click doesn't open for the first 0.9 seconds
    canvas.addEventListener("click", () => {
        let now = performance.now()
        if ((now - lastClick) <= 900) {
            showUI()
        }
        lastClick = now
    })
}

/**
 * Handle window resizes
 * @param renderer - The renderer that recieves the resize information
 */
function resize(renderer: Renderer) {
    const canvas = renderer.getCanvas()
    if (canvas instanceof HTMLCanvasElement) {
        // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
        const ratio = window.devicePixelRatio
        const rect = (<HTMLCanvasElement>canvas).getBoundingClientRect()
        const displayWidth = Math.round(rect.width * ratio!)
        const displayHeight = Math.round(rect.height * ratio!)
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth
            canvas.height = displayHeight
        }
        renderer.resize()
    }
}

/**
 * The top-level state of the application
 */
export interface AppState {
    activeUI: Layer
    backgroundRendererState: RenderingState
    imageRendererState: RenderingState
    textRendererState: RenderingState
    uiVisible: boolean
    debug: boolean
}

export interface RenderingState {
    availableRenderers: Map<string, RendererState>
    activeRenderer: RendererState
}
export interface RendererState {
    readonly renderer: Renderer
    readonly statefulScenes: Map<number, SceneState>
    activeScene: SceneState
}
export interface SceneState {
    readonly scene: Scene
    selectedObject: SceneObject
}


/**
 * Apply state changes to the state
 * @param state - The state to mutate
 * @param change - The change to apply
 * @returns A mutated state
 */
function changeState(state: AppState, change: StateChange): AppState {
    switch (change.type) {
        case "renderer": {
            switch (change.layer) {
                case "background": {
                    const newRenderer = state.backgroundRendererState.availableRenderers.get(change.newRenderer)
                    if (typeof newRenderer === "undefined") {
                        throw new Error(`Could not find new renderer in available renderers. Requested: ${change.newRenderer}`)
                    }
                    state.backgroundRendererState.activeRenderer = newRenderer
                    break
                }
                case "text": {
                    const newRenderer = state.textRendererState.availableRenderers.get(change.newRenderer)
                    if (typeof newRenderer === "undefined") {
                        throw new Error(`Could not find new renderer in available renderers. Requested: ${change.newRenderer}`)
                    }
                    state.textRendererState.activeRenderer = newRenderer
                    break
                }
                case "image": {
                    const newRenderer = state.imageRendererState.availableRenderers.get(change.newRenderer)
                    if (typeof newRenderer === "undefined") {
                        throw new Error(`Could not find new renderer in available renderers. Requested: ${change.newRenderer}`)
                    }
                    state.imageRendererState.activeRenderer = newRenderer
                    break
                }
            }
            return state
        }
        case "scene": {
            switch (change.layer) {
                case "background": {
                    const newScene = state.backgroundRendererState.activeRenderer.statefulScenes.get(change.newScene)
                    if (typeof newScene === "undefined") {
                        const statelessScene = state.backgroundRendererState.activeRenderer.renderer.getScenes().get(change.newScene)
                        if (typeof statelessScene === "undefined") {throw new Error(`Could not find new scene in available scenes. Requested: ${change.newScene}`)}
                        const newStatefulScene: SceneState = {
                            scene: statelessScene,
                            selectedObject: statelessScene.getObjects()[0]
                        }
                        state.backgroundRendererState.activeRenderer.statefulScenes.set(change.newScene, newStatefulScene)
                        state.backgroundRendererState.activeRenderer.activeScene = newStatefulScene
                    }
                    else {
                        state.backgroundRendererState.activeRenderer.activeScene = newScene
                    }
                    break
                }
                case "text": {
                    const newScene = state.textRendererState.activeRenderer.statefulScenes.get(change.newScene)
                    if (typeof newScene === "undefined") {
                        const statelessScene = state.textRendererState.activeRenderer.renderer.getScenes().get(change.newScene)
                        if (typeof statelessScene === "undefined") {throw new Error(`Could not find new scene in available scenes. Requested: ${change.newScene}`)}
                        const newStatefulScene: SceneState = {
                            scene: statelessScene,
                            selectedObject: statelessScene.getObjects()[0]
                        }
                        state.textRendererState.activeRenderer.statefulScenes.set(change.newScene, newStatefulScene)
                        state.textRendererState.activeRenderer.activeScene = newStatefulScene
                    }
                    else {
                        state.textRendererState.activeRenderer.activeScene = newScene
                    }
                    break
                }
                case "image": {
                    const newScene = state.imageRendererState.activeRenderer.statefulScenes.get(change.newScene)
                    if (typeof newScene === "undefined") {
                        const statelessScene = state.imageRendererState.activeRenderer.renderer.getScenes().get(change.newScene)
                        if (typeof statelessScene === "undefined") {throw new Error(`Could not find new scene in available scenes. Requested: ${change.newScene}`)}
                        const newStatefulScene: SceneState = {
                            scene: statelessScene,
                            selectedObject: statelessScene.getObjects()[0]
                        }
                        state.imageRendererState.activeRenderer.statefulScenes.set(change.newScene, newStatefulScene)
                        state.imageRendererState.activeRenderer.activeScene = newStatefulScene
                    }
                    else {
                        state.imageRendererState.activeRenderer.activeScene = newScene
                    }
                    break
                }
            }
            return state
        }
        case "object": {
            switch (change.layer) {
                case "background": {
                    state.backgroundRendererState.activeRenderer.activeScene.selectedObject = change.newObject
                    break
                }
                case "text": {
                    state.textRendererState.activeRenderer.activeScene.selectedObject = change.newObject
                    break
                }
                case "image": {
                    state.imageRendererState.activeRenderer.activeScene.selectedObject = change.newObject
                    break
                }
            }
            return state
        }
        case "sceneAdded": {
            return state
        }
        case "objectUpdate": {
            return state
        }
        case "layer": {
            state.activeUI = change.layer
            return state
        }
    }
}

function buildRenderingState(availableRenderers: Map<string, Renderer>, renderer: Renderer, scene: Scene, object: SceneObject): RenderingState {
    const statefulRenderersArray: [string, RendererState][] = []
    const initScene: SceneState = {
        scene: scene,
        selectedObject: object
    }
    const initSceneMap = new Map<number, SceneState>([[scene.id, initScene]])

    availableRenderers.forEach((val, key) => {
        statefulRenderersArray.push([key, {
            renderer: val,
            statefulScenes: initSceneMap,
            activeScene: {
                scene: scene,
                selectedObject: object
            }
        }])
    })
    const initialRenderer = statefulRenderersArray[0][1]
    return {
        availableRenderers: new Map(statefulRenderersArray),
        activeRenderer: initialRenderer
    }
}

/**
 * Types of state mutation
 */
export type StateChange = { 
    type: "renderer"
    layer: Layer
    newRenderer: string
}
| { type: "scene"
    layer: Layer
    newScene: number
}
| { type: "object"
    layer: Layer
    newObject: SceneObject
}
| { type: "layer"
    layer: Layer
}
| { type: "sceneAdded"
}
| { type: "objectUpdate"
}


async function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("/serviceworker.js", {scope: '/'})
        }
        catch (err) {
            console.error(`Service worker registration failed with ${err}`)
        }
    }
}

registerServiceWorker()
init()