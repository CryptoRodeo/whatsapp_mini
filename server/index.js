let express = require('express');
let app = express();
let partials = require('express-partials');
let http = require('http').createServer(app);
let io = require('socket.io')(http);
let session = require('express-session');
let UserList = require('./modules/users');

//middleware
app.use(partials());
app.use(express.static(__dirname + '/../node_modules'))
app.use(express.static(__dirname + '/../public'));
app.use(session({secret: 'i got nothing to hide', resave:false, saveUninitialized: false}));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/../views');

app.get('/', function(req, res){
  res.render('pages/index.ejs');
});

let user_list;

io.on('connection', (socket) => {

  let useradded = false;
  user_list = user_list || new UserList();//stops socket reconnection from rendering this array null

  socket.on('new user', (new_user) =>{ 
    if(useradded) return;
    
    socket.broadcast.emit("new participant");
    new_user.id = socket.id;
    user_list.addUser(new_user);
    useradded = true;
    active_users = user_list.getUsers();
    io.emit('update user info', new_user);
    io.emit('display new user', active_users);
});

socket.on('chat message', (message_details) =>
{
  let {current_user, message_sent} = message_details;
  current_user.message = message_sent;
  io.emit('chat message', current_user);
});

socket.on('user is typing', () => { socket.broadcast.emit('user is typing', (socket.id)); });
    
socket.on('user stopped typing', () => { socket.broadcast.emit('user stopped typing', socket.id); });
    
socket.on('update user list' , (new_user_list) => { user_list.updateList(new_user_list);  });

socket.on('reconnect' , () => {
  let disconnected_user_id = socket.id;
  active_users = user_list.getUsers();
  io.emit('remove user', { disconnected_user_id, active_users});
});
});

http.listen(8080, () => { console.log('listening on *:8080'); });