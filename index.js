const express = require('express');
const path = require('path');
const dotenv =  require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const PORT = process.env.PORT || 8080;
dotenv.config(); 
var fs = require('fs');
var https = require('https')
// var privateKeyServ  = fs.readFileSync('server.key', 'utf8');
// var certificate = fs.readFileSync('server.cert', 'utf8');
// var credentials = {key: privateKeyServ, cert: certificate};
const privateKey=process.env.PRIVATEKEY;
const publicKey=process.env.PUBLICKEY;



const config = {
  baseURL: process.env.APP_URL || `https://localhost:${PORT}`,
};

const app = express();
//ako je localhost
if(!process.env.PORT){

  // var httpsServer = https.createServer(credentials, app);
  
  // httpsServer.listen(8080);
  app.listen(PORT, function () {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
}

if(process.env.PORT)
  app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

var queue = null; //JSON.parse(fs.readFileSync('./queue.json'));
console.log(queue);

const webpush = require('web-push');
const SUBS_FILENAME = 'subscriptions.json';


app.set('trust proxy', 1) // trust first proxy
app.use(cookieParser());
var session = require('express-session');
// var FileStore = require('session-file-store')(session);
// var fileStoreOptions = {};

const pg = require('pg');

const pgSession = require('connect-pg-simple')(session);

const pgPool = new pg.Pool({
  connectionString: process.env.DBConfigLink,
  ssl: {
      rejectUnauthorized: false
  }
});
pgPool.query(`
CREATE TABLE IF NOT EXISTS queue (
  id INTEGER DEFAULT 1,
  data JSON DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER DEFAULT 1,
  data JSON DEFAULT '[]'
);

`);

function storeInto(table, data){
  pgPool.query("UPDATE "+table+" SET data = $1 WHERE id = 1", [data]);
}
async function getData(table){
  return (await pgPool.query("SELECT * FROM "+table+" WHERE id = 1")).rows[0].data;
}

let subscriptions = null;
// try {
//     subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
//     console.log(subscriptions);
// } catch (error) {
//     console.error(error);    
// }

app.use(session({
  store: new pgSession({
    pool: pgPool,                // Connection pool
    tableName: 'user_sessions',   // Use another table-name than the default "session" one,
    createTableIfMissing: true
  }),
  secret: 'DkmwFUPvAgzQAAxxbREBeMeuFvlTtrqa',
  cookie: { maxAge: 30*(1000 * 60 * 60 * 24) },
}
))
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true , limit: 52428800}));
app.use(express.static(path.join(__dirname, 'public')))
//   .set('views', path.join(__dirname, 'views'))
//   .set('view engine', 'ejs')
  //za heroku


app.get('*', async (req,res, next)=>{
  if(!subscriptions){
    console.log("init storing subs");
    subscriptions = await getData("subscriptions")
    //console.log(subscriptions);
  }else{
    console.log("subs exist");
    //console.log(subscriptions);
  }
  if(!queue){
    console.log("init storing queue");
    queue = await getData("queue")
    //console.log(queue);
  }else{
    console.log("queue exist");
    //console.log(queue);
  }
  next();
})

app.post('*', async (req,res, next)=>{
  if(!subscriptions){
    console.log("init storing subs");
    subscriptions = await getData("subscriptions")
    //console.log(subscriptions);
  }else{
    console.log("subs exist");
    //console.log(subscriptions);
  }
  if(!queue){
    console.log("init storing queue");
    queue = await getData("queue")
    //console.log(queue);
  }else{
    console.log("queue exist");
    //console.log(queue);
  }
  next();
})
// app.get('/notifications', (req,res) => {
//       res.sendFile(path.join(__dirname, "public", "notifications.html"));
// });


app.get('/', async (req,res) => {
    //console.log(req.session);
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
  
app.post('/next', (req,res) => {
  console.log("next");
  var q = queue.find(q=>q.ownerId == req.session.id);
  //console.log(q);
  if(q && q.waiting.length != 0){
    if(q.current){
      q.waiting.shift();
      q.current = q.waiting[0];
    }else{
      q.current = q.waiting[0];
    }
    storeInto("queue", JSON.stringify(queue));
    //fs.writeFileSync('./queue.json',JSON.stringify(queue));
    if(q.current)
      sendPushNotifications(q.current.userId, q.ownerName)
  }
  //console.log(q);

  res.sendStatus(200);
});
app.post("/saveSubscription", function(req, res) {
  //console.log(req.body);
  req.session.notificationsOn = true;
  let sub = {user:req.session.id, sub: req.body.sub};
  subscriptions.push(sub);
  //fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
  storeInto("subscriptions", JSON.stringify(subscriptions));
  res.json({
      success: true
  });
});
app.post("/hasQueue", function(req, res) {
  res.json({
      hasQueue: queue.findIndex(q=> q.ownerId == req.session.id) != -1
  });
});
app.post("/createQueue", function(req, res) {
  queue.push({ownerId: req.session.id, ownerName: req.session.username, waiting:[], current:null});
  storeInto("queue", JSON.stringify(queue));
  // fs.writeFileSync('./queue.json',JSON.stringify(queue));
  res.json({
      success: queue.findIndex(q=> q.ownerId == req.session.id) != -1
  });
});
app.post("/joinQueue", function(req, res) {
  if(queue.find(q=>q.ownerId == req.body.ownerId) && !queue.find(q=>q.ownerId == req.body.ownerId).waiting.find(u=> u.userId == req.session.id)){
    queue.find(q=>q.ownerId == req.body.ownerId).waiting.push({userId: req.session.id, userName: req.session.username});
    storeInto("queue", JSON.stringify(queue));
    // fs.writeFileSync('./queue.json',JSON.stringify(queue));
    sendPushNotificationsQueue(req.body.ownerId, req.session.username);
  }
  res.json({
      success: true
  });
});
app.post("/register", function(req, res) {
  //console.log(req.body);
  req.session.username = req.body.name;
  res.json({
      success: true
  });
});
app.post("/registerOwner", function(req, res) {
  //console.log(req.body);
  req.session.username = req.body.name;
  if(queue.findIndex(q=> q.ownerId == req.session.id) == -1){
    queue.push({ownerId: req.session.id, ownerName: req.session.username, waiting:[], current:null});
    storeInto("queue", JSON.stringify(queue));
    // fs.writeFileSync('./queue.json',JSON.stringify(queue));
  }
  res.json({
      success: queue.findIndex(q=> q.ownerId == req.session.id) != -1
  });
});
app.get('/queue', (req,res) => {
    res.sendFile(path.join(__dirname, "public", "queue.html"));
});
app.post('/queue', (req,res) => {

  res.json({
    queue: queue.find(q=>q.ownerId == req.session.id)
  });

});
app.get('/queueList', (req,res) => {
  res.sendFile(path.join(__dirname, "public", "queueList.html"));
});
[].map
app.post('/queueList', (req,res) => {
  //console.log(queue);
  res.json({
    myId: req.session.id,
    queue: queue
  });
});

app.get('/queueNumber', (req,res) => {
  res.sendFile(path.join(__dirname, "public", "queueNumber.html"));
});
app.post('/queueNumber', (req,res) => {
  //console.log(queue);
  //console.log( req);
  if(queue.find(q=>q.ownerId == req.query.id) && queue.find(q=>q.ownerId == req.query.id).waiting.find(u=> u.userId == req.session.id)){
    console.log("found");
    res.json({
      number: queue.find(q=>q.ownerId == req.query.id).waiting.findIndex(u=> u.userId == req.session.id)+1
    });
  } else{
    console.log("else");
    res.json({
      number: -1
    });
  }
});



async function sendPushNotifications(user, sender) {
    webpush.setVapidDetails('mailto:'+process.env.EMAIL, 
    publicKey,
    privateKey);
    console.log("sending");
    //console.log(user);
    //console.log(sender);
    //console.log(subscriptions);
    subscriptions.forEach(async sub => {
      //console.log(sub);

      if(sub.user == user){
        try {
          console.log("Sending notif to user ", sub);
          await webpush.sendNotification(sub.sub, JSON.stringify({
              title: 'Na redu ste kod '+sender+'!',
              body: sender+' vas očekuje.',
              redirectUrl: '/queueNumber?id='+user
            }));    
        } catch (error) {
            console.error(error);
        }
      }


        
    });
}
async function sendPushNotificationsQueue(user, sender) {
  webpush.setVapidDetails('mailto:'+process.env.EMAIL, 
  publicKey,
  privateKey);
  console.log("sending");
  //console.log(user);
  //console.log(sender);
  //console.log(subscriptions);
  subscriptions.forEach(async sub => {
    console.log(sub);

    if(sub.user==user){
      try {
        console.log("Sending notif to user ", sub);
        await webpush.sendNotification(sub.sub, JSON.stringify({
            title: sender+ ' čeka u redu!',
            body: "",
            redirectUrl: '/queue'
          }));    
      } catch (error) {
          console.error(error);
      }
    }

  });
}
