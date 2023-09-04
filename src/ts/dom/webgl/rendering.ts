// Core types and functions for doing rendering with WebGL (and some helpful extras)

export interface GLMesh {
    readonly vbo: WebGLBuffer
    readonly ebo: WebGLBuffer
    readonly elemCount: GLsizei
}

export type GLObject = {
    type: "attribarray"
    mesh: GLMesh
    attribs: AttribInfo[]
    program: WebGLProgram
}
|
{
    type: "vao"
    mesh: GLMesh
    vao: WebGLProgram
    program: WebGLProgram
}

interface AttribInfo {
    index: GLuint
    size: GLint
    type: GLenum
    normalize: GLboolean
    stride: GLsizei
    offset: GLintptr
}

function bindGLMesh(ctx: WebGLRenderingContext, obj: GLMesh) {
    ctx.bindBuffer(ctx.ARRAY_BUFFER, obj.vbo)
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, obj.ebo)
}

export function drawObject(ctx: WebGLRenderingContext, obj: GLObject, ext: (OES_vertex_array_object | null)) {
    ctx.useProgram(obj.program)
    if (obj.type === "vao") {
        if (ext) { //nested if for typescript
            ext.bindVertexArrayOES(obj.vao)
        }
    } else {
        bindGLMesh(ctx, obj.mesh)
        for (const attrib of obj.attribs) {
            ctx.enableVertexAttribArray(attrib.index)
            ctx.vertexAttribPointer(attrib.index, attrib.size, attrib.type, attrib.normalize, attrib.stride, attrib.offset)
        }
    }
    /*
    programInfo.attribInfo.forEach((attrib) => {
        ctx.enableVertexAttribArray(attrib.index)
    })
    */
    ctx.drawElements(ctx.TRIANGLE_STRIP, obj.mesh.elemCount, ctx.UNSIGNED_BYTE, 0)
}

export function createRenderQuad(ctx: WebGLRenderingContext): GLMesh {
    const vbo = ctx.createBuffer()!
    const ebo = ctx.createBuffer()!
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vbo)
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, ebo)
    const vertData = new Float32Array([
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0])
    const elemData = new Uint8Array([3, 0, 2, 1])
    ctx.bufferData(ctx.ARRAY_BUFFER, vertData.length * vertData.BYTES_PER_ELEMENT, ctx.STATIC_DRAW)
    ctx.bufferData(ctx.ARRAY_BUFFER, vertData, ctx.STATIC_DRAW)
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, elemData.length * elemData.BYTES_PER_ELEMENT, ctx.STATIC_DRAW)
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, elemData, ctx.STATIC_DRAW)
    return {vbo: vbo, ebo: ebo, elemCount: elemData.length}
}

const directVert = `attribute vec3 vertPos; void main() { gl_Position = vec4(vertPos, 1.0); }`

export function createVertShader(ctx: WebGLRenderingContext, vertSource: string): WebGLShader {
    const shader = ctx.createShader(ctx.VERTEX_SHADER)!
    ctx.shaderSource(shader, vertSource)
    ctx.compileShader(shader)
    return shader
}

export function createFragShader(ctx: WebGLRenderingContext, fragSource: string): WebGLShader {
    const shader = ctx.createShader(ctx.FRAGMENT_SHADER)!
    ctx.shaderSource(shader, fragSource)
    ctx.compileShader(shader)
    return shader
}

export function createShaderProgram(ctx: WebGLRenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
    const program = ctx.createProgram()!
    ctx.attachShader(program, vert)
    ctx.attachShader(program, frag)
    ctx.linkProgram(program)
    ctx.validateProgram(program)
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
        const info = ctx.getProgramInfoLog(program)
        throw new Error("Could not compile WebGL program. \n\n" + info)
    }
    return program
}

export function createDirectFragShader(ctx: WebGLRenderingContext, frag: WebGLShader): WebGLProgram {
    const vert = createVertShader(ctx, directVert)
    return createShaderProgram(ctx, vert, frag)
}

export function simpleFullscreenShader(ctx: WebGLRenderingContext, fragSource: string, ext: (OES_vertex_array_object | null)): GLObject {
    let vao: WebGLVertexArrayObject | null
    if (ext) {
        vao = ext.createVertexArrayOES()
        ext.bindVertexArrayOES(vao)
    }
    const frag = createFragShader(ctx, fragSource)
    const program = createDirectFragShader(ctx, frag)
    const quad = createRenderQuad(ctx)
    const pos = ctx.getAttribLocation(program, "vertPos")
    if (ext) {
        ctx.enableVertexAttribArray(pos)
        bindGLMesh(ctx, quad)
        ctx.vertexAttribPointer(pos, 3, ctx.FLOAT, false, 0, 0)
        return {type: "vao", mesh: quad, program: program, vao: vao!}
    }
    else {
        const attribInfo: AttribInfo = {
            index: pos,
            size: 3,
            type: ctx.FLOAT,
            normalize: false,
            stride: 0,
            offset: 0
        }
        return {type: "attribarray", mesh: quad, program: program, attribs: [attribInfo]}
    }
}