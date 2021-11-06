async function handleFetch(event){
    console.log('Handling fetch event for', event.request.url);

    let url = new URL(event.request.url);

    console.log('url', url)

    let cacheResponse = await caches.match(url)

    if(!cacheResponse){
        console.log('checking network')
        event.respondWith( await fetch(event.request) )
        console.log('done')
        return
    }

    console.log('cacheResponse')
    console.log(cacheResponse)

    event.respondWith( cacheResponse )
}

self.addEventListener('fetch', (event) => {
    event.waitUntil(handleFetch(event))
})

self.addEventListener('message', (message)=>{
    console.log('onmessage', message)
})

self.addEventListener('install', (event) => {
    console.log('install', event)
    event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
    console.log('activate', event)
    event.waitUntil(self.clients.claim())
})