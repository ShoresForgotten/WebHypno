import { Color } from "./color.js"
import { StateChange } from "./main.js"
import { createRenderer as createGLRenderer }  from "./webgl/state.js"

export type UserSetting = NumberSetting | ColorSetting | MultiSetting

/**
 * A setting with a value that is a number, including both ints and floats
 */
export interface NumberSetting {
    readonly type: "number",
    /** Setting name */
    readonly name: string,
    /** Minimum setting value, inclusive */
    readonly min?: number,
    /** Maximum setting value, inclusive */
    readonly max?: number,
    /** Is this setting an integer? */
    readonly whole: boolean
    /** Sets the value of the setting in the renderer
     * @param input - The desired value of the setting
     * @returns The actual value of the setting after being set
     */
    readonly set: (input: number) => number
    /** The value of the setting at time of creation of the object */
    readonly value: number
}

/**
 * A setting with a value that is a color
 */
export interface ColorSetting {
    readonly type: "color"
    /** Setting name */
    readonly name: string,
    /**
     * Sets the value of the setting in the renderer
     * @param input - The desired value of the setting
     * @returns The actual value of the setting after being set
     */
    readonly set: (input: Color) => Color
    /** The value of the setting at time of creation of the object */
    readonly value: Color
}

/**
 * Multiple settings that have some kind of logical grouping to be displayed to the user
 */
export interface MultiSetting {
    readonly type: "multi"
    /** Name of the group */
    readonly name: string
    /** The settings that make up the group */
    readonly settings: UserSetting[]
}

/**
 * A renderer that draws scenes to a canvas
 */
export interface Renderer {
    /**
     * Get the scenes that a given renderer has loaded
     * @returns A map where the keys are scene names and the values are scene objects
     */
    readonly getScenes: () => Map<string, Scene>
    /**
     * Pass on the new size of a canvas resize to the renderer and the scenes within
     * @param width - The new width of the canvas
     * @param height - The new height of the canvas
     * @returns nothing
     */
    readonly resize: (width?: number, height?: number) => void
    readonly getCanvas: () => HTMLCanvasElement | OffscreenCanvas
}

/**
 * A scene inside a renderer that can be drawn to a canvas
 */
export interface Scene {
    /**
     * The name of the scene, to be displayed to the user
     */
    readonly name: string
    /**
     * Pass on the new size of a renderer to the objeccts within the scene
     * @param width - The new width of the renderer
     * @param height - The new height of the renderer
     * @returns nothing
     */
    readonly resize: (width: number, height: number) => void
    /**
     * Get the settings that a user can set for this scene
     * @returns A map containing the settings. The key is the object that the settings apply to, while the array contains the settings themselves
     */
    readonly getSettings: () => Map<string, UserSetting[]>
    readonly draw: (t: number) => void
}

/**
 * An index of scenes and where to get the information to build them
 */
export interface Index {
    readonly webgl: Map<string, string>
}

/**
 * Create a renderer
 * @param type What kind of renderer to create (currently only webgl is available)
 * @param init The scene to create and use first
 * @param ctx The webgl context to use
 * @param index The index of scenes and scene information files to use to create scenes
 * @returns A tuple containing the renderer and the initial scene (...eventually)
 */
export async function initRenderer(type: "webgl", init: string, ctx: WebGLRenderingContext, index: Map<string, string>, update: (change: StateChange) => void): Promise<[Renderer, Scene]> {
        return createGLRenderer(ctx, init, index, update)
}
