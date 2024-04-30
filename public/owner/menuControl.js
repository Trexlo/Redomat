import {entries, setMany, set, get} from './idb-keyval.js'


let notificationsButton = document.getElementById("notifications-btn");
let notifications = document.getElementById("notifications");
let register = document.getElementById("register");
let menu = document.getElementById("menu");
// let queue = document.getElementById("queue");
// let queueList = document.getElementById("queueList");
// let queueNumber = document.getElementById("queueNumber");
let menuTitle = document.getElementById("menu-title");

let nameInput = document.getElementById("name-input");
let registerButton = document.getElementById("register-btn");

registerButton.onclick = async ()=>{
    let res = await fetch("/registerOwner", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({ name:nameInput.value }),
    });
    if (res.ok) {
        console.log("ok!");
        switchMenu("menu");
    }
}

async function onLoad(){
    [notifications
        ,   register
        ,   menu
          
           
           ].forEach(x=>{
           console.log("hiding "+x.id);
           x.style.display="none";
        });
   
        var currState= await get("state");
        console.log(currState);
        if(currState){
           document.getElementById(currState).style.display="flex";
        }else document.getElementById("notifications").style.display="flex";
}
onLoad();


navigator.serviceWorker.ready.then(reg=>{
    reg.pushManager.getSubscription().then(sub=>{
        if(sub){
            notifications.style.display="none";
            // notifications.className="active";
            // notifications.innerText="You are subscribed";
        }else{
            switchMenu("notifications");
        }
    });
})

if ("Notification" in window && "serviceWorker" in navigator) {
    notificationsButton.addEventListener("click", function () {
        Notification.requestPermission(async function (res) {
            console.log("Request permission result:", res);
            if (res === "granted") {
                await setupPushSubscription();
                switchMenu("register");

                // notifications.className="active";
                // notifications.innerText="You are subscribed";
            } else {
                console.log("User denied push notifs:", res);
            }
        });
    });
} else {
    notificationsButton.disabled=true;
}

function urlBase64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function setupPushSubscription() {
    try {
        let reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (sub === null) {
            var publicKey =
                "BBI87-F6M8-jRsDNtOOCnJZCOusgjwJK1-Hl9RXTR4Hyzko7oNTMbOf0ZCZB74tw5pVTCwLB9X_gphI1Px7gfg8";
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
            let res = await fetch("/saveSubscription", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({ sub }),
            });
            if (res.ok) {
                switchMenu("register");
                notifications.style.display="none";
                // notifications.className="active";
                // notifications.disabled=true;
                // notifications.innerText="You are subscribed";
            }
        } else {
            // alert("You are already subscribed!");
            switchMenu("register");
            notifications.style.display="none";
        }
    } catch (error) {
        console.log(error);
    }
}

async function switchMenu(menu, back=false){
    console.log("switching to "+menu);

        if(back){
            await set("prevStates", (await get("prevStates")).slice(1) );
        }else{
            if(!await get("prevStates")){
                await set("prevStates", [false]);
            }else
                await set("prevStates", [await get("state")].concat(await get("prevStates")) );
                
        }
        await set("state", menu);
        console.log(await get("prevStates"));
        console.log(await get("state"));
        if((await get("prevStates"))[0])
            document.getElementById((await get("prevStates"))[0]).style.display="none";
        document.getElementById(await get("state")).style.display="flex";
        switch (menu) {
            // case "notifications":menuTitle.textContent="Obavijesti";break;
            case "register":menuTitle.textContent="Registracija";break;
            case "menu":menuTitle.textContent="Izbornik";break;
            // case "queue":menuTitle.textContent="Vaš red";break;
            // case "queueList":menuTitle.textContent="Stani u red";break;
            // case "queueNumber":menuTitle.textContent="Vaš broj";break;
        
            default:
                break;
        }

}