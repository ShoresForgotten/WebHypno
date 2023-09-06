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
                const map = new Map<string, string>
                json.webgl.forEach((obj: any) => {
                    map.set(obj.name, obj.file)
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
    const indexLocation = "/shaders/index.json"
    const indexPromise = getIndex(indexLocation)
    const availableRenderers = new Map<string, Renderer>()
    const glContext = createGLContext()
    const rendererUpdateQueue: StateChange[] = []
    let glRenderer: [Renderer, Scene]
    if (glContext != null) {
        glContext[0].id = "webgl-renderer"
        glContext[0].classList.add("renderer")
        glRenderer = await initRenderer("webgl", "test", glContext[1], (await indexPromise).webgl, (stateChange) => {rendererUpdateQueue.push(stateChange)})
        availableRenderers.set("webgl", glRenderer[0])
    }
    else {
        throw new Error("fuck")
    }
    const state: AppState = {activeRenderer: glRenderer[0], activeScene: glRenderer[1], availableRenderers: availableRenderers}
    const stateChange = (change: StateChange) => {
        changeState(state, change)
        const elem = document.getElementById("ui-container")
        if (elem) {
            elem.replaceChildren(createSettingsUI(state, stateChange))
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
    document.getElementById("ui-container")?.appendChild(createSettingsUI(state, stateChange))
    document.body.appendChild(glContext[0])
    renderLoop(performance.now())
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