declare let self: ServiceWorkerGlobalScope
export default null

const CACHE_VERSION = 1
const CURRENT_CACHES = {
    glslShaders: `glsl-cache-v${CACHE_VERSION}`,
}

const addResourcesToCache = async (cacheName: string, resources: Request[]) => {
    const cache = await caches.open(cacheName)
    await cache.addAll(resources)
}

const deleteOldCaches = async () => {
    const keepList = Object.entries(CURRENT_CACHES).map((vals) => {return vals[1]})
    const keyList = await caches.keys()
    const delCaches = keyList.filter((key) => !keepList.includes(key))
    await Promise.all(delCaches.map(async (key) => {await caches.delete(key)}))
}

/* self.addEventListener("install", (event) => {
    event.waitUntil(
        
    )
}) */

self.onfetch = (event: FetchEvent) => {

}