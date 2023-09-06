// Core types and functions for doing rendering with WebGL (and some helpful extras)

/**
 * Holds the buffers for meshes
 */
export interface GLMesh {
    readonly vbo: WebGLBuffer
    readonly ebo: WebGLBuffer
    readonly elemCount: GLsizei
}

/**
 * Holds an object, a program, and either the information required for attribute pointers or just a VAO
 */
export type GLObject = {
        type: "attribarray"
        mesh: GLMesh
        attribs: AttribInfo[]
        program: WebGLProgram
    }
    | {
        type: "vao"
        mesh: GLMesh
        vao: WebGLProgram
        program: WebGLProgram
    }

/**
 * In the event that VAOs are not available, is used to hold the information required to set up attribute pointers
 */
interface AttribInfo {
    index: GLuint
    size: GLint
    type: GLenum
    normalize: GLboolean
    stride: GLsizei
    offset: GLintptr
}

/**
 * In the event that VAOs are not available, binds the buffers required to draw a mesh
 * @param ctx - The WebGLRenderingContext in which the mesh exists
 * @param obj - The object itself
 */
function bindGLMesh(ctx: WebGLRenderingContext, obj: GLMesh) {
    ctx.bindBuffer(ctx.ARRAY_BUFFER, obj.vbo)
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, obj.ebo)
}

/**
 * Draws the given object
 * @param ctx - The WebGLRenderingContext in which the object exists
 * @param obj - The object itself
 * @param ext - The extension that adds VAOs, if available
 */
export function drawObject(ctx: WebGLRenderingContext, obj: GLObject, ext: (OES_vertex_array_object | null)) {
    ctx.useProgram(obj.program)
    if (obj.type === "vao") {
        if (ext) { 
            ext.bindVertexArrayOES(obj.vao)
        }
        else {
            console.error("Tried to draw an object using a VAO, but the VAO extension was not provided")
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
    if (obj.type === "vao" && ext) {
        ext.bindVertexArrayOES(null)
    }
}

/**
 * Creates an object that fills the screen if coordinates are directly used as NDCs
 * @param ctx - The WebGLRenderingContext in which to create the quad
 * @returns An object containing the rendering quad's mesh
 */
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

/**
 * GLSL code for using vertex positions directly as NDCs
 */
const directVert = `attribute vec3 vertPos; void main() { gl_Position = vec4(vertPos, 1.0); }`

/**
 * Turn a string containing GLSL source code into a vertex shader
 * @param ctx - The WebGLRenderingContext in which the shader will exist
 * @param vertSource - The source code for the shader
 * @returns A vertex shader
 */
export function createVertShader(ctx: WebGLRenderingContext, vertSource: string): WebGLShader {
    const shader = ctx.createShader(ctx.VERTEX_SHADER)!
    ctx.shaderSource(shader, vertSource)
    ctx.compileShader(shader)
    return shader
}

/**
 * Turn a string containing GLSL source code into a fragment shader
 * @param ctx - The WebGLRenderingContext in which the shader will exist
 * @param fragSource - The source code for the shader
 * @returns A fragment shader
 */
export function createFragShader(ctx: WebGLRenderingContext, fragSource: string): WebGLShader {
    const shader = ctx.createShader(ctx.FRAGMENT_SHADER)!
    ctx.shaderSource(shader, fragSource)
    ctx.compileShader(shader)
    return shader
}

/**
 * Attaches and links a vertex shader and fragment shader into a program
 * @param ctx - The WebGLContext in which the shaders exist
 * @param vert - The vertex shader
 * @param frag - The fragment shader
 * @returns A WebGL program
 */
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

/**
 * Takes a fragment shader and directly attaches and links it with the direct vertex shader
 * @param ctx - The WebGLContext in which the shaders exist
 * @param frag - The fragment shader
 * @returns A WebGL program
 */
export function createDirectFragShader(ctx: WebGLRenderingContext, frag: WebGLShader): WebGLProgram {
    const vert = createVertShader(ctx, directVert)
    return createShaderProgram(ctx, vert, frag)
}

/**
 * Creates an object that renders the given GLSL fragment shader source code to screen
 * @param ctx - The WebGLContext in which the returned object will exist
 * @param fragSource - The source code for the fragment shader
 * @param ext - The VAO extension, if available
 * @returns An object that renders a fragment shader directly to the target
 */
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