// WebGL state handling types and functions
import { GLMesh, GLObject, drawObject, simpleFullscreenShader } from "./rendering.js"
import { Renderer, Scene, UserSetting } from "../graphics.js"
import { Color, colorToFloats, floatsToColor, colorStringToFloats } from "../color.js"

type GLUniformInfo = GLColorUniformInfo | GLIntUniformInfo | GLFloatUniformInfo | GLMultiUniformInfo

type GLColorUniformInfo = Readonly<_GLColorUniformInfo>
interface _GLColorUniformInfo {
    type: "color"
    name: string
    accessor: string
    init: string
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

type GLIntUniformInfo = Readonly<_GLIntUniformInfo>
interface _GLIntUniformInfo {
    type: "int"
    min?: number
    max?: number
    accessor: string
    name: string
    init: number
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

type GLFloatUniformInfo = Readonly<_GLFloatUniformInfo>
interface _GLFloatUniformInfo {
    type: "float"
    min?: number
    max?: number
    accessor: string
    name: string
    init: number
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

type GLMultiUniformInfo = Readonly<_GLMultiUniformInfo>
interface _GLMultiUniformInfo {
    type: "multi",
    name: string,
    settings: GLUniformInfo[]
}

function isMultiUniform(o: any): o is GLMultiUniformInfo {
    if (typeof o === "object" && o !== null) {
        if (o.type === "multi" &&
            typeof o.name === "string" &&
            (typeof o.settings === "object" && Array.isArray(o.settings))) {
                const hits: boolean[] = o.settings.map((object: any) => {
                    if (isFloatUniform(object) || isIntUniform(object) || isColorUniform(object) || isMultiUniform(object)) {
                        return true
                    }
                    else {
                        return false
                    }
                })
                if (hits.includes(false)) {
                    return false
                }
                else {
                    return true
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

export function createUIInfo(ctx: WebGLRenderingContext, program: WebGLProgram , uniform: GLUniformInfo): UserSetting {
    switch (uniform.type) {
        case "color": {
            ctx.useProgram(program)
            const location = ctx.getUniformLocation(program, uniform.accessor)!
            const rawValue: Float32Array = ctx.getUniform(program, location)
            const value: Color = { red: rawValue[0], green: rawValue[1], blue: rawValue[2]}
            const callback = (input: Color) => {
                let vals = new Float32Array(colorToFloats(input))
                ctx.useProgram(program)
                ctx.uniform3fv(location, vals)
                return floatsToColor(ctx.getUniform(program, location))
            }
            return {type: "color", name: uniform.name,
            callback: callback, value: value}
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
                callback: callback,
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
                callback: callback,
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

type GLUIShaderInfo = Readonly<_GLUIShaderInfo>
interface _GLUIShaderInfo {
    name: string
    fileName: string
    time?: string
    resolution?: string
    debugOnly: boolean
    uniforms: GLUniformInfo[]
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


interface GLState {
    ctx: WebGLRenderingContext
    activeScene: Scene
    scenes: Scene[]
}

type GLRegularObject = Readonly<_GLRegularObject>
interface _GLRegularObject {
    obj: GLObject
    update?: (time: number) => void
    frameResize?: (width: number, height: number) => void
    draw: () => void
}

type GLUserSettableObject = Readonly<_GLUserSettableObject>
interface _GLUserSettableObject extends GLRegularObject{
    name: string
    userSettings: GLUniformInfo[]
}

function fetchShader(infoFileName: string): Promise<[GLUIShaderInfo, string]> {
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

export async function createRenderer(ctx: WebGLRenderingContext, init: string, index: Map<string, string>): Promise<[Renderer, Scene]> {
    const initPath = index.get(init)
    if (initPath === undefined) throw new Error("Initial shader is not in provided map")
    const shaderPromise = fetchShader(initPath)
    const vaoExt = ctx.getExtension("OES_vertex_array_object")
    ctx.clearColor(0.0, 0.0, 0.0, 1.0)
    ctx.clearDepth(1.0)
    ctx.enable(ctx.DEPTH_TEST)
    ctx.depthFunc(ctx.LEQUAL)
    const shader = await shaderPromise
    if (shader === undefined) {
        throw new Error("Error in retrieving shader or shader info")
    }
    const fullscreen = simpleFullscreenShader(ctx, shader[1], vaoExt)
    const timeUpdate = (shader[0].time) ? (time: number) => {
            ctx.useProgram(fullscreen.program)
            const location = 
                ctx.getUniformLocation(fullscreen.program, shader[0].time!)
            ctx.uniform1f(location, time)
        } 
        : undefined
    
    const resUpdate = (shader[0].resolution) ? 
        (width: number, height: number) => {
            ctx.useProgram(fullscreen.program)
            const location = 
                ctx.getUniformLocation(fullscreen.program, shader[0].resolution!)
            ctx.uniform2f(location, width, height)
        }
        : undefined
    ctx.useProgram(fullscreen.program)
    shader[0].uniforms.forEach((x) => initUniform(ctx, fullscreen.program, x))
    const obj: GLUserSettableObject = {
        name: shader[0].name,
        obj: fullscreen,
        userSettings: shader[0].uniforms,
        update: timeUpdate,
        frameResize: resUpdate,
        draw: () => { drawObject(ctx, fullscreen, vaoExt) }
    }
    if (obj.frameResize) {
        obj.frameResize(ctx.drawingBufferWidth, ctx.drawingBufferHeight)
    }
    const scene = createGLScene(ctx, [obj], [], shader[0].name)
    const scenes = new Set<Scene>([scene])
    return [{
        resize: (width?: number, height?: number) => {
            const x = (width) ? width : ctx.canvas.width
            const y = (height) ? height : ctx.canvas.height
            ctx.viewport(0, 0, x, y)
            scenes.forEach((scene) => {
                    scene.frameResize(x, y)
                })
        },
        getScenes: () => {return scenes}
    }, scene]
}

function createGLScene(ctx: WebGLRenderingContext, settableObjects: GLUserSettableObject[], regularObjects: GLRegularObject[], name: string, draw?: () => void): Scene {
    return {
        name: name,
        frameResize: (width: number, height: number) => {
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
        getSettings: () => {
            const map = new Map<string, UserSetting[]>()
            settableObjects.forEach((obj) => {
                const settings = obj.userSettings.map((x) => createUIInfo(ctx, obj.obj.program, x))
                map.set(obj.name, settings)
            })
            return map
        }
    }
}

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