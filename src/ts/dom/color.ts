export type Color = Readonly<_Color>
interface _Color {
    red: number,
    green: number,
    blue: number,
}

export function colorToString(color: Color): string {
    return color.red.toString(16) + color.green.toString(16) + color.blue.toString(16)
}

export function stringToColor(str: string): Color {
    if (str.startsWith('#')) { str = str.substring(1) }
    let r = str.substring(0, 2)
    let g = str.substring(2, 4)
    let b = str.substring(4, 6)
    return {
        red: Number.parseInt(r, 16),
        green: Number.parseInt(g, 16),
        blue: Number.parseInt(b, 16)
    }
}

export function colorToFloats(color: Color): [number, number, number] {
    let r = color.red / 255.0
    let g = color.green / 255.0
    let b = color.blue / 255.0
    return [r, g, b]
}

export function floatsToColor(floats: [number, number, number]): Color {
    let vals = floats.map((num) => num * 255)
    return {red: vals[0], green: vals[1], blue: vals[2]}
}

export function colorStringToFloats(str: string): [number, number, number] {
    return colorToFloats(stringToColor(str))
}