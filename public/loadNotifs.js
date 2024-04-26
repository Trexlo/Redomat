
import {entries, setMany, set, get} from './idb-keyval.js'

var notifElem = document.getElementById("notifications");

get('notifications').then(notifications=>{
    console.log(notifications);
    if(notifications)
        notifications.forEach(n=>{
            notifElem.innerHTML+=`<h2>${n.title}</h2><p>${n.time} - ${n.body}</p>`
        })
})