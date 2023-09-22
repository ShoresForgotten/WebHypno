import { Renderer, Scene, SceneObject, UserSetting } from "../graphics.js";
import { StateChange } from "../main.js";

interface ImageObject {
    content?: HTMLImageElement,
    name: string
    path: string
    scale: {x: number, y: number},
    rotation: number,
    offset: {x: number, y: number}
    alpha: number
}

function drawImage(ctx: CanvasRenderingContext2D, obj: ImageObject): void {
    if (obj.content) {
        ctx.save()
        const verticalScaleScalar = ctx.canvas.height / obj.content.naturalHeight // If we were to scale it to the vertical
        const horizontalScaleScalar = ctx.canvas.width / obj.content.naturalWidth // If we were to scale it to the horizontal
        const scaleScalar: number = (verticalScaleScalar < horizontalScaleScalar) ? verticalScaleScalar : horizontalScaleScalar // Factor to make the image fit to screen
        const deltaHorizontal: number = (ctx.canvas.width - obj.content.naturalWidth * obj.scale.x * scaleScalar) * 0.5 // Distance from side when scaled and centered
        const deltaVertical: number = (ctx.canvas.height - obj.content.naturalHeight * obj.scale.y * scaleScalar) * 0.5 // Distance from top when scaled and centered
        ctx.translate(deltaHorizontal + (ctx.canvas.width * 0.5 * obj.offset.x), deltaVertical + (ctx.canvas.height * 0.5 * obj.offset.y))
        ctx.translate(obj.content.naturalWidth * 0.5 * scaleScalar * obj.scale.x, obj.content.naturalHeight * 0.5 * scaleScalar * obj.scale.y)
        ctx.rotate(obj.rotation * Math.PI / 180)
        ctx.translate(-obj.content.naturalWidth * 0.5 * scaleScalar * obj.scale.x, -obj.content.naturalHeight * 0.5 * scaleScalar * obj.scale.y)
        ctx.scale(obj.scale.x * scaleScalar, obj.scale.y * scaleScalar)
        ctx.globalAlpha = obj.alpha
        ctx.drawImage(obj.content, 0, 0)
        ctx.restore()
    }
}

function imageObjectSettings(obj: ImageObject, change: () => void): UserSetting[] {
    const settings: UserSetting[] = []
    settings.push({type: "string", name: "Name", value: obj.name, set: (input) => {obj.name = input; change(); return obj.name}})
    settings.push({type: "multi", name: "Image", settings: [
                {type: "file", name: "File", path: obj.path, multiple: false, accept: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"],
                    set: (input) => {
                        if (input.length >= 1) {
                            obj.content = processImage(input[0])
                        }
                        change()
                    }
                },
                {type: "imagePreview", name: "Preview", elem: obj.content}
            ]})
    settings.push({type: "multi", name: "Scale", settings: [
        {type: "number", name: "Horizontal scale", set: (input) => {obj.scale.x = input; return obj.scale.x}, whole: false, value: obj.scale.x},
        {type: "number", name: "Vertical scale", set: (input) => {obj.scale.y = input; return obj.scale.y}, whole: false, value: obj.scale.y}
        ]})
    settings.push({type: "number", name: "Rotation", value: obj.rotation, set: (input) => {obj.rotation = input; return obj.rotation}, whole: false})
    settings.push({type: "multi", name: "Offset", settings: [
        {type: "number", name: "Horizontal offset", set: (input) => {obj.offset.x = input; return obj.offset.x}, whole: false, value: obj.offset.x},
        {type: "number", name: "Vertical offset", set: (input) => {obj.offset.y = input; return obj.offset.y}, whole: false, value: obj.offset.y}
        ]})
    settings.push({type: "number", name: "Opacity", value: obj.alpha, whole: false, min: 0, max: 1, set: (input) => {obj.alpha = input; return obj.alpha}})
    return settings
}

interface TimedImage {
    content: ImageObject
    active: number // Amount of time that the image displays (in seconds)
    inactive: number // Amount of time that it doesn't (in seconds)
    tOffset: number // Offset from start time
}

function timedImageSettings(obj: TimedImage, change: () => void): UserSetting[] {
    const settings: UserSetting[] = imageObjectSettings(obj.content, change)
    settings.push({type: "number", name: "Active time", value: obj.active, set: (input) => {obj.active = input; return obj.active}, whole: false})
    settings.push({type: "number", name: "Inactive time", value: obj.inactive, set: (input) => {obj.inactive = input; return obj.inactive}, whole: false})
    settings.push({type: "number", name: "Time offset", value: obj.tOffset, set: (input) => {obj.tOffset = input; return obj.tOffset}, whole: false})
    return settings
}

function createBlankImage(): TimedImage {
    return {
        content: {
            name: "",
            path: "",
            scale: {x: 1, y: 1},
            rotation: 0,
            offset: {x: 0, y: 0},
            alpha: 1
        },
        active: 1,
        inactive: 0,
        tOffset: 0
    }
}

function drawTimedImage(ctx: CanvasRenderingContext2D, obj: TimedImage, time: number): void {
    const objTime = (time / 1000 + obj.tOffset) % (obj.active + obj.inactive)
    if (objTime <= obj.active) {
        drawImage(ctx, obj.content)
    }
}


function createImageScene(ctx: CanvasRenderingContext2D, name: string, debug: boolean, stateUpdate: (change: StateChange) => void): Scene {
    const imageObjs: TimedImage[] = [createBlankImage()]
    function imageToSceneObject(image: TimedImage, id: number): SceneObject {
        return {
            name: image.content.name,
            id: id,
            settings: timedImageSettings(image, () => {stateUpdate({type: "objectUpdate"})})
        }
    }
    return {
        name: name,
        debug: debug,
        draw: (t: number) => {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.save()
            //ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2)
            imageObjs.forEach((obj) => {
                if (obj.content.content) {
                    drawTimedImage(ctx, obj, t)
                }
            })
            ctx.restore()
        },
        resize: () => {},
        getObjects: () => {
            if (imageObjs[imageObjs.length - 1].content.content !== undefined) {
                imageObjs.push(createBlankImage())
            }
            return imageObjs.map((obj, index) => {
                return imageToSceneObject(obj, index)
            })
        },
        id: 0
    } 
}

export function createImageRenderer(ctx: CanvasRenderingContext2D, stateUpdate: (change: StateChange) => void): [Renderer, Scene] {
    const scene = createImageScene(ctx, "default", false, stateUpdate)
    const sceneMap = new Map<number, Scene>([[0, scene]])
    const renderer: Renderer = {
        name: "Image",
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

function processImage(file: File): HTMLImageElement {
    const src = URL.createObjectURL(file)
    const image = new Image()
    image.src = src
    URL.revokeObjectURL(src)
    return image
}