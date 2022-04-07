/*class BrowserFetch {

}*/

let pendingRequests = {}

class InterceptRequest {
    constructor(clientId, request){

        let url = new URL(request.url);
        this.clientId = clientId
        this.pathname = url.pathname

        this.resolve = null
        this.reject = null
        this.promise = new Promise((resolve,reject)=>{
            this.resolve = resolve
            this.reject = reject
        })

        this.data = null
        this.finished = null
    }

    get id(){
        return this.clientId + '.' + this.pathname
    }

    async start(){
        this.finished = false
        const client = await self.clients.get(this.clientId)

        client.postMessage({
            type: 'fetch-intercept-request',
            path: this.pathname
        })
    }

    complete(data){
        if(this.finished){ return }
        this.data = data
        this.finished = true

        let response = new Response(this.data, {status: 200 })
        this.resolve(response)
        pendingRequests[this.id] = null
    }
}



async function fetchFromBrowser(clientId, request){
    let intercept = new InterceptRequest(clientId, request)

    pendingRequests[intercept.id] = intercept


    await intercept.start()
    return intercept.promise
}

async function handleFetch(event){
    

    let url = new URL(event.request.url);

    

    if(url.pathname.indexOf('/virtual/pkg/') == 0){
        console.log('Handling fetch event for', event.request.url);
        console.log('url', url)
        console.log('event', event)

        event.respondWith( fetchFromBrowser(event.clientId, event.request) )
        return
    }
    else{ 
        console.log('checking network')
        event.respondWith( fetch(event.request) )
        console.log('done')
        return
    }
}

self.addEventListener('fetch', (event) => {
    event.waitUntil(handleFetch(event))
})

self.addEventListener('message', (message)=>{
    console.log('onmessage', message)


    if(message.data && message.data.type == 'fetch-intercept-response'){
        let interceptId = message.source.id + '.' + message.data.path

        console.log('looking up intercept: ', interceptId)
        intercept = pendingRequests[interceptId]

        if(intercept){
            console.log('intercept found', intercept)

            intercept.complete(message.data.data)
        }
    }
})

self.addEventListener('install', (event) => {
    console.log('install', event)
    event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
    console.log('activate', event)
    event.waitUntil(self.clients.claim())
})