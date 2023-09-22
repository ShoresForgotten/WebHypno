import { Color } from "./color.js"

export type Layer = "background" | "text" | "image"
export type UserSetting = NumberSetting | ColorSetting | MultiSetting | ButtonSetting | StringSetting | DropdownSetting | FileSetting |ImagePreview

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

export interface ButtonSetting {
    readonly type: "button"
    readonly name: string
    readonly push: () => void
}

export interface StringSetting {
    readonly type: "string"
    readonly name: string
    readonly value: string
    readonly set: (input: string) => string
}

export interface DropdownSetting {
    readonly type: "dropdown"
    readonly name: string
    readonly options: string[]
    readonly active: string
    readonly set: (input: string) => string
}

export interface FileSetting {
    readonly type: "file"
    readonly name: string
    readonly path: string
    readonly accept: string[]
    readonly multiple: boolean
    readonly set: (files: FileList) => void
}

export interface ImagePreview {
    readonly type: "imagePreview"
    readonly name: string
    readonly elem?: HTMLImageElement
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
    readonly name: string
    /**
     * Get the scenes that a given renderer has loaded
     * @returns A map where the keys are scene ids and the values are scene objects
     */
    readonly getScenes: () => Map<number, Scene>
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
     * Should this scene only be viewable while in debug mode
     */
    readonly debug: boolean
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
    //readonly getSettings: () => Map<string, UserSetting[]>
    readonly getObjects: () => SceneObject[]
    readonly draw: (t: number) => void
    readonly id: number
}

export interface SceneObject {
    readonly name: string
    readonly id: number
    readonly settings: UserSetting[]
}
/**
 * An index of scenes and where to get the information to build them
 */
export interface Index {
    readonly webgl: Map<number, string>
}