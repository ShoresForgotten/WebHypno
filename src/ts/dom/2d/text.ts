import { Color, colorToString } from "../color.js";
import { MultiSetting, Renderer, Scene, SceneObject, UserSetting } from "../graphics.js";
import { StateChange } from "../main.js";

interface TextObject {
    content: string,
    scale: {x: number, y: number},
    rotation: number,
    offset: {x: number, y: number}
    font: FontInfo
    style: "fill" | "stroke"
    color: Color
}

interface FontInfo {
    fontSize: string
    fontFamily: string
}

function drawText(ctx: CanvasRenderingContext2D, obj: TextObject): void {
    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "1px " + obj.font.fontFamily
    const textSize = ctx.measureText(obj.content)
    const largestVertical = Math.max(textSize.actualBoundingBoxAscent, textSize.actualBoundingBoxDescent)
    const largestHorizontal = Math.max(textSize.actualBoundingBoxLeft, textSize.actualBoundingBoxRight) * 1.05
    const verticalScaleScalar = ctx.canvas.height / 2 / largestVertical // If we were to scale it to the vertical
    const horizontalScaleScalar = ctx.canvas.width / 2 / largestHorizontal // If we were to scale it to the horizontal
    const scaleScalar: number = (verticalScaleScalar < horizontalScaleScalar) ? verticalScaleScalar : horizontalScaleScalar
    let useFontSize: string
    if (obj.font.fontSize === "") {
        useFontSize = Math.floor(scaleScalar).toString() + "px"
    }
    else {
        useFontSize = obj.font.fontSize
    }
    ctx.translate(obj.offset.x * (ctx.canvas.width / 2), obj.offset.y * (ctx.canvas.height / 2))
    ctx.scale(obj.scale.x, obj.scale.y)
    ctx.rotate(obj.rotation * Math.PI / 180)
    ctx.font = useFontSize + " " + obj.font.fontFamily
    if (obj.style === "fill") {
        ctx.fillStyle = '#' + colorToString(obj.color)
        ctx.fillText(obj.content, 0, 0)
    }
    else {
        ctx.strokeStyle = '#' + colorToString(obj.color)
        ctx.strokeText(obj.content, 0, 0)
    }
    ctx.restore()
}

function textObjectSettings(obj: TextObject, textChange: () => void): UserSetting[] {
    const settings: UserSetting[] = []
    settings.push({type: "string", name: "Text content", value: obj.content, set: (input) => {obj.content = input; textChange(); return obj.content}})
    settings.push({type: "multi", name: "Scale", settings: [
        {type: "number", name: "Horizontal scale", set: (input) => {obj.scale.x = input; return obj.scale.x}, whole: false, value: obj.scale.x},
        {type: "number", name: "Vertical scale", set: (input) => {obj.scale.y = input; return obj.scale.y}, whole: false, value: obj.scale.y}
        ]})
    settings.push({type: "number", name: "Rotation", value: obj.rotation, set: (input) => {obj.rotation = input; return obj.rotation}, whole: false})
    settings.push({type: "multi", name: "Offset", settings: [
        {type: "number", name: "Horizontal offset", set: (input) => {obj.offset.x = input; return obj.offset.x}, whole: false, value: obj.offset.x},
        {type: "number", name: "Vertical offset", set: (input) => {obj.offset.y = input; return obj.offset.y}, whole: false, value: obj.offset.y}
        ]})
    settings.push({type: "color", name: "Color", value: obj.color, set: (input) => {obj.color = input; return obj.color}})
    settings.push({type: "dropdown", name: "Fill style", active: obj.style, options: ["fill", "stroke"], set: (input) => {
        if (input === "fill" || input === "stroke") {
            obj.style = input
            return obj.style
        }
        else return obj.style
    }})
    settings.push({type: "multi", name: "Font", settings: [
        {type: "string", name: "Font Size (CSS)", value: obj.font.fontSize, set: (input) => {obj.font.fontSize = input; return obj.font.fontSize}},
        {type: "string", name: "Font Family (CSS)", value: obj.font.fontFamily, set: (input) => {obj.font.fontFamily = input; return obj.font.fontFamily}}
    ]})
    return settings
}

interface TimedText {
    content: TextObject
    active: number // Amount of time that the text displays (in seconds)
    inactive: number // Amount of time that it doesn't (in seconds)
    tOffset: number // Offset from start time
}

function timedTextSettings(obj: TimedText, textChange: () => void): UserSetting[] {
    const settings: UserSetting[] = textObjectSettings(obj.content, textChange)
    const fontSetting = settings.pop()
    settings.push({type: "number", name: "Active time", value: obj.active, set: (input) => {obj.active = input; return obj.active}, whole: false})
    settings.push({type: "number", name: "Inactive time", value: obj.inactive, set: (input) => {obj.inactive = input; return obj.inactive}, whole: false})
    settings.push({type: "number", name: "Time offset", value: obj.tOffset, set: (input) => {obj.tOffset = input; return obj.tOffset}, whole: false})
    if (fontSetting) settings.push(fontSetting)
    return settings
}

function createBlankText(): TimedText {
    return {
        content: {
            content: "",
            scale: {x: 1, y: 1},
            rotation: 0,
            offset: {x: 0, y: 0},
            font: {
                fontSize: "",
                fontFamily: "sans-serif"
            },
            style: "fill",
            color: {red: 0, green: 0, blue: 0}
        },
        active: 1,
        inactive: 0,
        tOffset: 0
    }
}

function drawTimedText(ctx: CanvasRenderingContext2D, obj: TimedText, time: number): void {
    const objTime = (time / 1000 + obj.tOffset) % (obj.active + obj.inactive)
    if (objTime <= obj.active) {
        drawText(ctx, obj.content)
    }
}


function createTextScene(ctx: CanvasRenderingContext2D, name: string, debug: boolean, stateUpdate: (change: StateChange) => void): Scene {
    const textObjs: TimedText[] = [createBlankText()]
    function textToSceneObject(text: TimedText, id: number): SceneObject {
        return {
            name: text.content.content,
            id: id,
            settings: timedTextSettings(text, () => {stateUpdate({type: "objectUpdate"})})
        }
    }
    return {
        name: name,
        debug: debug,
        draw: (t: number) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.save()
            ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2)
            textObjs.forEach((obj) => {
                if (obj.content.content !== "") {
                    drawTimedText(ctx, obj, t)
                }
            })
            ctx.restore()
        },
        resize: () => {},
        getObjects: () => {
            if (textObjs[textObjs.length - 1].content.content.trim() !== "") {
                textObjs.push(createBlankText())
            }
            return textObjs.map((obj, index) => {
                return textToSceneObject(obj, index)
            })
        },
        id: 0
    } 
}

export function createTextRenderer(ctx: CanvasRenderingContext2D, stateUpdate: (change: StateChange) => void): [Renderer, Scene] {
    const scene = createTextScene(ctx, "default", false, stateUpdate)
    const sceneMap = new Map<number, Scene>([[0, scene]])
    const renderer: Renderer = {
        name: "Text",
        getScenes: () => {
            return sceneMap
        },
        resize: () => {
            
        },
        getCanvas: () => {
            return ctx.canvas
        }
    }
    return [renderer, scene]
}