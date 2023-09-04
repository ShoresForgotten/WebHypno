import { Index, Renderer, Scene, initRenderer } from "./graphics.js"

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

interface State {
    activeRenderer: Renderer
    activeScene: Scene
}

async function init(): Promise<void> {
    const indexLocation = "/shaders/index.json"
    const indexPromise = getIndex(indexLocation)
    const glContext = createGLContext()
    let glRenderer: [Renderer, Scene]
    if (glContext != null) {
        glContext[0].id = "webgl-renderer"
        glContext[0].classList.add("renderer")
        glRenderer = await initRenderer("webgl", "spiral", glContext[1], (await indexPromise).webgl)
    }
    else {
        throw new Error("fuck")
    }
    const state = {activeRenderer: glRenderer[0], activeScene: glRenderer[1]}
    const resize = () => {
        // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
        const canvas = glContext[0]
        const ratio = window.devicePixelRatio
        const rect = canvas.getBoundingClientRect()
        const displayWidth = Math.round(rect.width * ratio)
        const displayHeight = Math.round(rect.height * ratio)
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth
            canvas.height = displayHeight
        }
        glRenderer[0].resize()
    }
    const renderLoop = (t: number) => {
        requestAnimationFrame(renderLoop)
        state.activeScene.draw(t)
        resize()
    }
    document.body.appendChild(glContext[0])
    renderLoop(performance.now())
}

document.addEventListener("DOMContentLoaded", () => {init()})