declare let self: ServiceWorkerGlobalScope
export type {} // if this line isn't deleted from the output, it doesn't work

const CACHE_VERSION = 1 // Increment on updates
const SOURCE_FILES = [
    "/js/color.js",
    "/js/graphics.js",
    "/js/main.js",
    "/js/userinterface.js",
    "/js/webgl/rendering.js",
    "/js/webgl/state.js",
    "/js/2d/text.js",
    "/js/2d/image.js"
]

async function addResourcesToCache(resources: string[]) {
    const cache = await caches.open(`v${CACHE_VERSION}`)
    await cache.addAll(resources)
}

async function addToCache(request: Request, response: Response) {
    const cache = await caches.open(`v${CACHE_VERSION}`)
    await cache.put(request, response)
}

async function deleteOldCaches(): Promise<void> {
    const keepList = [`v${CACHE_VERSION}`]
    const keyList = await caches.keys()
    const delCaches = keyList.filter((key) => !keepList.includes(key))
    await Promise.all(delCaches.map(async (key) => {await caches.delete(key)}))
}

async function cacheFirst(request: Request): Promise<Response> {
    const cacheResponse = await caches.match(request)
    if (cacheResponse) {
        return cacheResponse
    }
    else {
        const networkResponse = await fetch(request)
        addToCache(request, networkResponse.clone())
        return networkResponse
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil(getShaderFileLocations("/shaders/index.json").then((shaderFiles) => {
        const list = ["/index.html", "/style.css", "/shaders/index.json"].concat(SOURCE_FILES).concat(shaderFiles)
        addResourcesToCache(list)
    }))
})

self.addEventListener("fetch", (event) => {
    event.respondWith(cacheFirst(event.request))
})

self.addEventListener("activate", (event) => {
    event.waitUntil(deleteOldCaches())
})
/**
 * I don't want to look at this any more
 * @param indexLocation Where to get the global index of all shaders
 * @returns A promise containing a list of every shader-related file to cache
 */
async function getShaderFileLocations(indexLocation: string): Promise<string[]> {
    const index = await fetch(indexLocation).then((response) => response.json())
    const acc: string[] = []
    Object.entries(index).forEach(([rendererName, entries]) => {
        if (Array.isArray(entries)) {
            const acc2: string[] = []
            entries.forEach((entry) => {
                if (typeof entry === "object" && entry !== null
                    && entry.file !== undefined) {
                        const hateThisTypingSystem = entry.file
                        if (typeof hateThisTypingSystem === "string") {
                            acc2.push(entry.file)
                        }
                }
            })
            if (rendererName === "webgl") {
                acc2.forEach((str) => {
                    acc.push("/shaders/webgl/" + str)
                })
            }
        }
    })
    const shaderFiles = acc.map((infoFileLocation) => {
        return fetch(infoFileLocation).then((file) => file.json())
            .then((json) => {
                if (typeof json === "object" && json !== null
                    && json.fileName !== undefined) {
                        const fileName = json.filename
                        if (typeof fileName === "string") {
                            return fileName
                        }
                        else return null
                }
                else return null
            })
    })
    await Promise.all(shaderFiles).then((fileNames) => {
        fileNames.forEach((fileName) => {
            if (fileName) {
                acc.push(fileName)
            }
        })
    })
    return acc
}