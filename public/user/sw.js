import { get, set, entries, del, update } from "./idb-keyval.js";

const filesToCache = [
    "/",
    "manifest.json",
    "index.html",
    "offline.html",
    "loadNotifs.js",
    "menuControl.js",
    "idb-keyval.js",
    "queue.html",
    "queueList.html",
    "queueNumber.html",
    "push.js",
    "404.html",
    "/stylesheets/index.css"
];

const staticCacheName = "static-cache";

self.addEventListener("install", (event) => {
    console.log("Attempting to install service worker and cache static assets");
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener("activate", (event) => {

    const cacheWhitelist = [staticCacheName];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
console.log();
self.addEventListener("fetch", (event) => {
    //console.log(event);
    event.respondWith(
        caches
            .match(event.request)
            .then((response) => {
                // if (response && !response.url.includes('/images')) {
                //     //console.log("Found " + event.request.url + " in cache!");
                //     return response;
                // }
                return fetch(event.request).then((response) => {
                    if (response.status === 404) {
                        return caches.match("404.html");
                    }
                    return caches.open(staticCacheName).then((cache) => {
                        cache.put(event.request.url, response.clone());
                        return response;
                    });
                });
            })
            .catch((error) => {
                console.log("Error", event.request.url, error);
                return caches.match("offline.html");
            })
    );
});


// self.addEventListener('sync', function (event) {
//     console.log('Background sync!', event);
//     if (event.tag === 'sync-images') {
//         event.waitUntil(
//             syncImages()
//         );
//     }
// });

// let syncImages = async function () {
//     var sub = await self.registration.pushManager.getSubscription();
//     entries().then(entries=>{
//         entries.forEach(entry =>{
//             if(entry[0].startsWith("uploadedImage")){
//                     console.log(entry[0]);
//                     fetch('/upload', {
//                             method: 'POST',
//                             headers: {
//                                 'Content-Type':'application/json'
//                             },
//                             body: JSON.stringify({data:entry[1], sub:sub})
//                         })
//                         .then(function (res) {
//                             if (res.ok) {
//                                 update("images", (val)=> {
//                                     if(!val) val = []
//                                     val.push(entry[1]);
//                                     del(entry[0]);
//                                     return val;
//                                 });
//                             } else {
//                                 console.log(res);
//                             }
//                         })
//                         .catch(function (error) {
//                             console.log(error);
//                         });
//             }
//         })
//     });
// }


self.addEventListener("push", function (event) {

    var data = { title: "title", body: "body", redirectUrl: "/" };
    if (event.data) {
        try {
            data = JSON.parse(event.data.text());
        } catch (error) {
            console.log("could not parse ", event.data);   
        }
    }
    update('notifications', val=>{
        if(!val)val=[];
        val.push({title:data.title, body:data.body, time:new Date()});
        return val;
    })
    var options = {
        body: data.body,
        icon: "/img/android/android-launchericon-96-96.png",
        badge: "/img/android/android-launchericon-96-96.png",
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
            redirectUrl: data.redirectUrl,
        },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
    let notification = event.notification;
    console.log("notification", notification);
    event.waitUntil(
        clients.matchAll().then(function (clis) {
            clis.forEach((client) => {
                client.navigate(notification.data.redirectUrl);
                client.focus();
            });
            notification.close();
        })
    );
});

self.addEventListener("notificationclose", function (event) {
    update('notifications', val=>{
        if(!val)val=[];
        val.push({title:"closed notificaion", body:event, time:new Date()});
        return val;
    })
});

