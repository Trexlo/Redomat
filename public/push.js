let notifications = document.getElementById("notificationsButton");
navigator.serviceWorker.ready.then(reg=>{
    reg.pushManager.getSubscription().then(sub=>{
        if(sub){
            notifications.disabled=true;
            notifications.className="active";
            notifications.innerText="You are subscribed";
        }
    });
})

if ("Notification" in window && "serviceWorker" in navigator) {
    notifications.addEventListener("click", function () {
        Notification.requestPermission(async function (res) {
            console.log("Request permission result:", res);
            if (res === "granted") {
                await setupPushSubscription();
                notifications.disabled=true;
                notifications.className="active";
                notifications.innerText="You are subscribed";
            } else {
                console.log("User denied push notifs:", res);
            }
        });
    });
} else {
    notifications.disabled=true;
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
                "BKugWulFasP30j8kc0Any9a8TWIpqaPTV2nt9kM1Ks2MEYp_0Zz7mJG0GR-xhj4edcGQEdMF9htqyJyW4e5JNZk";
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
                notifications.className="active";
                notifications.disabled=true;
                notifications.innerText="You are subscribed";
            }
        } else {
            alert("You are already subscribed!");
        }
    } catch (error) {
        console.log(error);
    }
}
