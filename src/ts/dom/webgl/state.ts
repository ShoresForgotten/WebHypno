// WebGL state handling types and functions
import { GLMesh, GLObject, drawObject, simpleFullscreenShader } from "./rendering.js"
import { Renderer, Scene, SceneObject, UserSetting } from "../graphics.js"
import { Color, colorToFloats, floatsToColor, colorStringToFloats } from "../color.js"
import { StateChange } from "../main.js"

type GLUniformInfo = GLColorUniformInfo | GLIntUniformInfo | GLFloatUniformInfo | GLMultiUniformInfo

/**
 * Description of a uniform present in the target fragment shader which takes a vec3 to represent a color
 */
interface GLColorUniformInfo {
    readonly type: "color"
    readonly name: string
    readonly accessor: string
    readonly init: string
}

function isColorUniform(o: any): o is GLColorUniformInfo {
    if (typeof o === "object" && o !== null) {
        return (o.type === "color" &&
                typeof o.name === "string" &&
                typeof o.accessor === "string" &&
                typeof o.init === "string")
    }
    else {
        return false
    }
}

/**
 * Description of a uniform present in the target fragment shader which takes an integer as an input
 */
interface GLIntUniformInfo {
    readonly type: "int"
    readonly min?: number
    readonly max?: number
    readonly accessor: string
    readonly name: string
    readonly init: number
}

function isIntUniform(o: any): o is GLIntUniformInfo {
    if (typeof o === "object" && o !== null) {
        return (o.type === "int" &&
                (typeof o.min === "undefined" || typeof o.min === "number") &&
                (typeof o.max === "undefined" || typeof o.max === "number") &&
                typeof o.accessor === "string" &&
                typeof o.name === "string" &&
                typeof o.init === "number")
    }
    else {
        return false
    }
}

/**
 * Description of a uniform present in the target fragment shader which takes a float as an input
 */
interface GLFloatUniformInfo {
    readonly type: "float"
    readonly min?: number
    readonly max?: number
    readonly accessor: string
    readonly name: string
    readonly init: number
}

function isFloatUniform(o: any): o is GLFloatUniformInfo {
    if (typeof o === "object" && o !== null) {
        return (o.type === "float" &&
                (typeof o.min === "undefined" || typeof o.min === "number") &&
                (typeof o.max === "undefined" || typeof o.max === "number") &&
                typeof o.accessor == "string" &&
                typeof o.name === "string" &&
                typeof o.init === "number")
    }
    else {
        return false
    }
}

/**
 * Container that indicates the UI connection between two other uniforms
 */
interface GLMultiUniformInfo {
    type: "multi",
    name: string,
    settings: GLUniformInfo[]
}

function isMultiUniform(o: any): o is GLMultiUniformInfo {
    if (typeof o === "object" && o !== null) {
        if (o.type === "multi" &&
            typeof o.name === "string" &&
            Array.isArray(o.settings)) {
                const badUniforms: any[] = o.settings.filter((object: any) => {
                    if (isFloatUniform(object) || isIntUniform(object) || isColorUniform(object) || isMultiUniform(object)) {
                        return false
                    }
                    else {
                        return true
                    }
                })
                if (badUniforms.length === 0) {
                    return true
                }
                else {
                    return false
                }
            }
        else {
            return false
        }
    }
    else {
        return false
    }
}

function isUniform(o: any): o is GLUniformInfo {
    return (isColorUniform(o) || isFloatUniform(o) || isIntUniform(o) || isMultiUniform(o))
}

/**
 * Create the UI description of a given uniform
 * @param ctx - The WebGLContext in which everything is happening
 * @param program - The WebGLProgram which the user interacts with
 * @param uniform - The uniform description
 * @returns An object that describes the UI requirements for the given uniform (with a setter anonymous function)
 */
export function createUIInfo(ctx: WebGLRenderingContext, program: WebGLProgram , uniform: GLUniformInfo): UserSetting {
    switch (uniform.type) {
        case "color": {
            ctx.useProgram(program)
            const location = ctx.getUniformLocation(program, uniform.accessor)!
            const rawValue: Float32Array = ctx.getUniform(program, location)
            const value: Color = floatsToColor([rawValue[0], rawValue[1], rawValue[2]])
            const callback = (input: Color) => {
                let vals = new Float32Array(colorToFloats(input))
                ctx.useProgram(program)
                ctx.uniform3fv(location, vals)
                return floatsToColor(ctx.getUniform(program, location))
            }
            return {type: "color", name: uniform.name,
            set: callback, value: value}
        }
        case "float": {
            ctx.useProgram(program)
            const location = ctx.getUniformLocation(program, uniform.accessor)!
            const value: GLfloat = ctx.getUniform(program, location)
            const callback = (input: number) => {
                ctx.useProgram(program)
                ctx.uniform1f(location, input)
                return ctx.getUniform(program, location)
            }
            return {
                type: "number", 
                name: uniform.name,
                min: uniform.min,
                max: uniform.max,
                whole: false,
                set: callback,
                value: value
            }
        }
        case "int": {
            ctx.useProgram(program)
            const location = ctx.getUniformLocation(program, uniform.accessor)!
            const value: GLint = ctx.getUniform(program, location)
            const callback = (input: number) => {
                ctx.useProgram(program)
                ctx.uniform1i(location, input)
                return ctx.getUniform(program, location)
            }
            return {
                type: "number",
                name: uniform.name,
                min: uniform.min,
                max: uniform.max,
                whole: true,
                set: callback,
                value: value
            }
        }
        case "multi": {
            return {
                type: "multi",
                name: uniform.name,
                settings: uniform.settings.map((x) => createUIInfo(ctx, program, x))
            }
        }
    }
}

function parseShaderInfo(json: string): GLUIShaderInfo {
    const obj = JSON.parse(json)
    if (isGLUIShaderInfo(obj)) {
        return obj
    }
    else {
        throw new Error("Error in parsing shader info file")
    }
}

/**
 * Information that pertains to the shader as a whole
 */
interface GLUIShaderInfo {
    readonly name: string
    readonly fileName: string
    readonly time?: string
    readonly resolution?: string
    readonly debugOnly: boolean
    readonly uniforms: GLUniformInfo[]
}

function isGLUIShaderInfo(o: any): o is GLUIShaderInfo {
    if (typeof o === "object" && o !== null) {
        if (typeof o.name === "string" &&
                typeof o.fileName === "string" &&
                (typeof o.time === "string" || typeof o.time === "undefined") &&
                (typeof o.resolution === "string" || typeof o.resolution === "string") &&
                typeof o.debugOnly === "boolean" &&
                (typeof o.uniforms === "object" && Array.isArray(o.uniforms))) {
                    const hits: any[] = o.uniforms.filter((x: any) => !isUniform(x))
                    return (hits.length === 0)
                }
        else {
            return false
        }
    }
    else {
        return false
    }
}

/**
 * An object that can be drawn to screen
 */
interface GLRegularObject {
    readonly obj: GLObject
    readonly update?: (time: number) => void
    readonly frameResize?: (width: number, height: number) => void
    readonly draw: () => void
}

/**
 * An object that can be drawn to screen and the user can set settings on
 */
interface GLUserSettableObject extends GLRegularObject{
    readonly name: string
    readonly userSettings: GLUniformInfo[]
}

/**
 * Fetch the shader source and parse the information related to it
 * @param infoFileName - The filename of the information file
 * @returns The UI information of the shader and the source of the shader... eventually
 */
async function fetchShader(infoFileName: string): Promise<[GLUIShaderInfo, string]> {
    // this would be nicer with do notation and monad transformers (or really any effect system that's not this)
    return fetch("/shaders/webgl/" + infoFileName)
        .then((response) => {
            if (response.ok) {
                return response
            }
            else {
                throw new Error(response.status.toString());
            }
        })
        .then((response) => response.json())
        .then((infoJson) => {
            if (isGLUIShaderInfo(infoJson)) {
                return infoJson
            }
            else {
                throw new Error("Recieved JSON does not match schema for shader info")
            }
        })
        .then(async (info) => [info, await (fetch("/shaders/webgl/" + info.fileName)
            .then((response) => response.text()))]) 
}

/**
 * Create a WebGL renderer
 * @param ctx - The WebGLRenderingContext to use
 * @param init - The index number of the shader to start with
 * @param index - The index containing all shader information files
 * @param stateUpdate - An anonymous function that informs the global application state about renderer updates
 * @returns A renderer and an initial scene
 */
export async function createRenderer(ctx: WebGLRenderingContext, init: number, index: Map<number, string>, stateUpdate: (state: StateChange) => void): Promise<[Renderer, Scene]> {
    const vaoExt = ctx.getExtension("OES_vertex_array_object")
    let initFileName = index.get(init)
    if (!initFileName) {
        initFileName = index.get(index.keys().next().value)
        if (!initFileName) {
            throw new Error(`Error in getting any filename from index.\nIndex: ${index}`)
        }
    }
    const toGet: [number, string][] = []
    index.forEach((val, key) => {
        if (val !== initFileName) {
            toGet.push([key, val])
        }
    })
    const scene = loadScene(ctx, initFileName, init, vaoExt)
    ctx.clearColor(0.0, 0.0, 0.0, 1.0)
    ctx.clearDepth(1.0)
    ctx.enable(ctx.DEPTH_TEST)
    ctx.depthFunc(ctx.LEQUAL)
    const renderer: Promise<Renderer> = scene.then((scene) => {
        const scenes = new Map<number, Scene>([[init, scene]])
        toGet.forEach(([key, val]) => {
            loadScene(ctx, val, key, vaoExt).then((scene) => {
                scenes.set(key, scene)
                stateUpdate({type: "sceneAdded"})
            })
        })
        return {
            name: "WebGL",
            resize: (width?: number, height?: number) => {
                const x = (width) ? width : ctx.canvas.width
                const y = (height) ? height : ctx.canvas.height
                ctx.viewport(0, 0, x, y)
                scenes.forEach((scene) => {
                        scene.resize(x, y)
                    })
            },
            getScenes: () => {return scenes},
            getCanvas: () => {return ctx.canvas}
        }
    })
    return [await renderer, await scene]
}

/**
 * Create a scene
 * @param ctx - The WebGLContext which is simply everything
 * @param settableObjects - Objects that have attributes settable by users
 * @param regularObjects - Non-settable objects
 * @param name - The name of the scene
 * @param draw - How to draw the scene
 * @returns A scene
 */
function createGLScene(ctx: WebGLRenderingContext, settableObjects: GLUserSettableObject[], regularObjects: GLRegularObject[], name: string, id: number, debug: boolean, draw?: () => void): Scene {
    let counter: number = 0
    const objects: SceneObject[] = settableObjects.map((obj) => {
        return {
            name: obj.name,
            id: counter++,
            settings: obj.userSettings.map((x) => createUIInfo(ctx, obj.obj.program, x))
        }
    })
    return {
        name: name,
        id: id,
        debug: debug,
        resize: (width: number, height: number) => {
            regularObjects.forEach((obj) => {
                if (obj.frameResize) obj.frameResize(width, height)
            })
            settableObjects.forEach((obj) => {
                if (obj.frameResize) obj.frameResize(width, height)
            })
        },
        draw: draw ? draw : (t) => {
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT)
            regularObjects.forEach((obj) => {
                if (obj.update) {
                    obj.update(t)
                }
                obj.draw()
            })
            settableObjects.forEach((obj) => {
                if (obj.update) {
                    obj.update(t)
                }
                obj.draw()
            })
        },
        getObjects: () => {
            const objects: SceneObject[] = []
            settableObjects.forEach((obj) => {
                const settings = obj.userSettings.map((x) => createUIInfo(ctx, obj.obj.program, x))
                objects.push({name: obj.name, settings: settings, id: objects.length})
            })
            return objects
        },
    }
}

/**
 * Initialize uniform values
 * @param ctx - Coooooonnnnnteeeeexxxxxt
 * @param program - The program to set the uniforms on
 * @param info - Information about the program's uniforms
 */
function initUniform(ctx: WebGLRenderingContext, program: WebGLProgram, info: GLUniformInfo): void {
    switch (info.type) {
        case "color": {
            const location = ctx.getUniformLocation(program, info.accessor)
            ctx.uniform3fv(location, colorStringToFloats(info.init))
            break;
        }
        case "int": {
            const location = ctx.getUniformLocation(program, info.accessor)
            ctx.uniform1i(location, info.init)
            break;
        }
        case "float": {
            const location = ctx.getUniformLocation(program, info.accessor)
            ctx.uniform1f(location, info.init)
            break;
        }
        case "multi": {
            info.settings.forEach((x) => initUniform(ctx, program, x))
        }
    }
}

/**
 * Asynchronously load a scene
 * @param ctx - txetnoc
 * @param fileName - The name of the information file to use
 * @param ext - VAO extension, if available
 * @returns A promise to return a scene
 */
async function loadScene(ctx: WebGLRenderingContext, fileName: string, id: number, ext: (OES_vertex_array_object | null)): Promise<Scene> { // It would be nice to put this in a webworker or smth
        const sceneData = await fetchShader(fileName)
        const renderObj = simpleFullscreenShader(ctx, sceneData[1], ext)

        const timeUpdate = (sceneData[0]) ? (time: number) => {
            ctx.useProgram(renderObj.program)
            const location = 
                ctx.getUniformLocation(renderObj.program, sceneData[0].time!)
            ctx.uniform1f(location, time)
        } 
        : undefined
    
        const resUpdate = (sceneData[0].resolution) ? 
        (width: number, height: number) => {
            ctx.useProgram(renderObj.program)
            const location = 
                ctx.getUniformLocation(renderObj.program, sceneData[0].resolution!)
            ctx.uniform2f(location, width, height)
        }
        : undefined

        sceneData[0].uniforms.forEach((x) => {
            ctx.useProgram(renderObj.program)
            initUniform(ctx, renderObj.program, x)
        })
        const obj: GLUserSettableObject = {
            name: sceneData[0].name,
            obj: renderObj,
            userSettings: sceneData[0].uniforms,
            update: timeUpdate,
            frameResize: resUpdate,
            draw: () => { drawObject(ctx, renderObj, ext) }
        }
        if (obj.frameResize) {
            obj.frameResize(ctx.drawingBufferWidth, ctx.drawingBufferHeight)
        }
        return createGLScene(ctx, [obj], [], sceneData[0].name, id, sceneData[0].debugOnly)
}