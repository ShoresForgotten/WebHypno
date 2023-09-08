import { Index, Renderer, Scene, initRenderer } from "./graphics.js"
import { createSettingsUI } from "./userinterface.js"

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
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext("webgl")
        if (ctx instanceof WebGLRenderingContext) return [canvas, ctx]
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

    const indexLocation = "/shaders/index.json"
    const indexPromise = getIndex(indexLocation)
    const uiHider = document.getElementById("ui-hider")
    const availableRenderers = new Map<string, Renderer>()
    const glContext = createGLContext()
    const rendererUpdateQueue: StateChange[] = []
    let glRenderer: [Renderer, Scene]
    if (glContext != null) {
        glContext[0].id = "webgl-renderer"
        glContext[0].classList.add("renderer")
        glRenderer = await initRenderer("webgl", 1, glContext[1], (await indexPromise).webgl, (stateChange) => {rendererUpdateQueue.push(stateChange)})
        availableRenderers.set("webgl", glRenderer[0])
        if (uiHider) {
            addShowUIFunctionality(glContext[0], () => {uiHider.hidden = false})
        }
    }
    else {
        throw new Error("fuck")
    }
    const state: AppState = {activeRenderer: glRenderer[0], activeScene: glRenderer[1], availableRenderers: availableRenderers, uiVisible: false, debug: true}
    const settingsConainer = document.getElementById("ui")
    const stateChange = (change: StateChange) => {
        changeState(state, change)
        if (settingsConainer) {
            settingsConainer.replaceChildren(...createSettingsUI(state, stateChange))
        }
    }
    const renderLoop = (t: number) => {
        requestAnimationFrame(renderLoop)
        const nextQueue = rendererUpdateQueue.pop()
        if (nextQueue) {
            stateChange(nextQueue)
        }
        resize(glRenderer[0])
        state.activeScene.draw(t)
    }
    settingsConainer?.replaceChildren(...createSettingsUI(state, stateChange))
    if (uiHider) {
        document.getElementById("ui-close")?.addEventListener("click", () => {
            uiHider.hidden = true
        })
    }
    document.body.appendChild(glContext[0])
    renderLoop(performance.now())
}

/**
 * Put the show UI listeners on the given canvas.
 * If the browser has no touchscreen, it's double click (900ms)
 * If the browser has a touchscreen, swiping down works too
 * @param canvas The canvas to attach the event listeners to
 * @param showUI What to do when the UI is to be shown
 */
function addShowUIFunctionality(canvas: HTMLCanvasElement, showUI: () => void) {
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
    availableRenderers: Map<string, Renderer>
    activeRenderer: Renderer
    activeScene: Scene
    uiVisible: boolean
    debug: boolean
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
            state.activeRenderer = change.newRenderer
            // todo
            return state
        }
        case "scene": {
            state.activeScene = change.newScene
            return state
        }
        case "sceneAdded": {
            return state
        }
    }
}

/**
 * Types of state mutation
 */
export type StateChange = { 
    type: "renderer"
    newRenderer: Renderer
}
| { type: "scene"
    newScene: Scene
}
| { type: "sceneAdded"
}

document.addEventListener("DOMContentLoaded", () => {init()})