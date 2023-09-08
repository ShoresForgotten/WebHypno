export type Color = Readonly<_Color>
interface _Color {
    red: number,
    green: number,
    blue: number,
}

export function colorToString(color: Color): string {
    const clr = colorToInts(color)
    return clr.map((x) => paddedToString(x)).reduce((acc, n) => acc + n)
}

function paddedToString(n: number): string {
    const str = n.toString(16)
    if (str.length < 2) {
        return "0" + str
    }
    else return str
}

export function stringToColor(str: string): Color {
    if (str.startsWith('#')) { str = str.substring(1) }
    const r = str.substring(0, 2)
    const g = str.substring(2, 4)
    const b = str.substring(4, 6)
    return {
        red: Number.parseInt(r, 16),
        green: Number.parseInt(g, 16),
        blue: Number.parseInt(b, 16)
    }
}

export function colorToFloats(color: Color): [number, number, number] {
    const r = color.red / 255.0
    const g = color.green / 255.0
    const b = color.blue / 255.0
    return [r, g, b]
}

export function floatsToColor(floats: [number, number, number]): Color {
    const vals = floats.map((num) => num * 255)
    return {red: vals[0], green: vals[1], blue: vals[2]}
}

export function colorStringToFloats(str: string): [number, number, number] {
    return colorToFloats(stringToColor(str))
}

export function colorToInts(color: Color): [number, number, number] {
    return [Math.round(color.red * 255), Math.round(color.green * 255), Math.round(color.blue * 255),]
}

export function colorEqual(colorOne: Color, colorTwo: Color): boolean {
    return (colorOne.red === colorTwo.red &&
            colorOne.green === colorTwo.green &&
            colorOne.blue === colorTwo.blue)
}