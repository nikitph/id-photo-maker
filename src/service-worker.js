import { build, files, version } from '$service-worker';
const CACHE=`idphoto-${version}`;
const shell=['/',...build,...files.filter(f=>!f.endsWith('.wasm')&&!f.endsWith('.tflite')&&!f.includes('vision_wasm'))];
const vision=['/vision/face_detector.tflite','/vision/selfie_segmenter.tflite','/vision/vision_wasm_internal.js','/vision/vision_wasm_internal.wasm'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(shell)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('idphoto-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='CACHE_VISION')event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(vision)).then(()=>event.source?.postMessage({type:'OFFLINE_READY'})));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);if(response.ok)cache.put(event.request,response.clone());return response;}catch{if(event.request.mode==='navigate')return(await cache.match('/'))||new Response('Open ID Photo Maker online once to use it offline.',{status:503});return new Response('Unavailable offline',{status:503});}})());
});
