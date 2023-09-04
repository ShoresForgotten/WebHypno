import { Color } from "./color.js"
import { createRenderer as createGLRenderer }  from "./webgl/state.js"

export type UserSetting = NumberSetting | ColorSetting | MultiSetting

export interface NumberSetting {
    readonly type: "number",
    readonly name: string,
    readonly min?: number,
    readonly max?: number,
    readonly whole: boolean
    readonly callback: (input: number) => number
    value: number
}

export interface ColorSetting {
    readonly type: "color"
    readonly name: string,
    readonly callback: (input: Color) => Color
    value: Color
}

export interface MultiSetting {
    readonly type: "multi"
    readonly name: string
    readonly settings: UserSetting[]
}

export type Renderer = Readonly<_Renderer>
interface _Renderer {
    getScenes(): Set<Scene>
    resize(width?: number, height?: number): void
}

export type Scene = Readonly<_Scene>
interface _Scene {
    name: string
    frameResize(width: number, height: number): void
    getSettings(): Map<string, UserSetting[]>
    draw(t: number): void
}

export type Index = Readonly<_Index>
interface _Index {
    webgl: Map<string, string>
}

export async function initRenderer(type: "webgl", init: string, ctx: WebGLRenderingContext, index: Map<string, string>): Promise<[Renderer, Scene]> {
        return createGLRenderer(ctx, init, index)
}
