var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http, {
  pingTimeout: 1000,
  pingInterval: 100,
});
var uuid = require('node-uuid');
var mysql = require('mysql'); //运行 npm install mysql --save 安装数据库依赖
var connection = mysql.createConnection({
  host : 'localhost',
  user : 'root',
  password: 'root',
  database: 'Snake'
});
/**
 * 数据表结构
 * `id` INT AUTO INCREMENT PRIMARY KEY
 * `name` TEXT
 * `score` INT
 */
connection.connect();
var Rooms = []; //  房间信息
var AllFood = [];
for(var i = 0; i < 666; i++) {
  var food_info = {};
  food_info.id = uuid.v1();
  food_info.x = Math.random() * (5000 - 10) + 10;
  food_info.y = Math.random() * (3000 - 10) + 10;
  food_info.intake = Math.round(Math.random() * 2) + 1;
  food_info.color = Math.round(Math.random() * 6);
  AllFood.push(food_info);
}
//第一个房间初始化
var room = {
  id: 'room'+ Rooms.length,
  Snakes: AllSnakes=[],
  Food: AllFood,
  num : Rooms.length,
  sockets: sockets=[]
};
Rooms.push(room);
var PeopleLimit = 2;  //每个房间人数仙子
var code = 1;
var RoomName = {};  //房间与客户端映射 socket.id: roomname
var NewSnakeLength = 20;

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('join', function() {
    var name = uuid.v1(); //  改成微信的名字
    var laterscore = 0;   //  之前数据库记录的分数
    var nowscore = 300;   //  现在的分数
    /**
     * 分数采用每次游戏取最高记录
     * 游戏中每个房间单独排名
     */
    // 查询分数
    var sqlcore = "SELECT * FROM rank WHERE name = '"+name+"';";
    connection.query(sqlcore, function(err,result){
      if(err) {
        console.log(err.message);
      }
      else {
        if (result.length == 0) {
          var sql = "INSERT INTO rank(name,score) VALUES('"+name+"', "+nowscore+");";
          connection.query(sql, function(err, result) {
            if(err) {
              console.log(err.message);
            }
            else {
              laterscore = nowscore;
            }
          });
        }
        else {
          laterscore = result[0].score
          console.log(result[0].score);
        }
      }
    });
    // 分房
    if (Rooms[Rooms.length-1].sockets.length == PeopleLimit) {
      var AllFood = [];
      for(var i = 0; i < 666; i++) {
        var food_info = {};
        food_info.id = uuid.v1();
        food_info.x = Math.random() * (5000 - 10) + 10;
        food_info.y = Math.random() * (3000 - 10) + 10;
        food_info.intake = Math.round(Math.random() * 2) + 1;
        food_info.color = Math.round(Math.random() * 6);
        AllFood.push(food_info);
      }
      var room = {
        id: 'room'+ Rooms.length,
        Snakes: AllSnakes=[],
        Food: AllFood,
        num : Rooms.length,
        sockets: sockets=[]
      };
      Rooms.push(room);
      socket.leave(socket.id);
      Rooms[Rooms.length -1].sockets.push(socket.id);
      RoomName[socket.id] = room.num;
      socket.join(RoomName[socket.id]);
    }
    else {
      socket.leave(socket.id);
      Rooms[Rooms.length -1].sockets.push(socket.id);
      RoomName[socket.id] = Rooms[Rooms.length -1].num;
      socket.join(Rooms[Rooms.length -1].id);
    }
    var id = uuid.v1();
    var snakeX = Math.random() * (5000 - 10 - 1920/2);
    var snakeY = Math.random() * (3000 - 10 - 1080/2);
    var bodypoint = [];


    for (var i = 0; i < NewSnakeLength; i++) {
      var bodyinfo = {
        id: uuid.v1(),
        x: snakeX,
        y: snakeY,
        color: Math.round(Math.random() * 6)
      };
      bodypoint.push(bodyinfo);
    }
    var NewSnake = {
      id: id,
      x: snakeX,
      y: snakeY,
      body: bodypoint,
      code: '#Player'+code
    }
    code++;
    socket.emit('create',JSON.stringify(NewSnake));
    socket.emit('allfood', JSON.stringify(Rooms[RoomName[socket.id]].Food));
    socket.emit('other_snake',JSON.stringify(Rooms[RoomName[socket.id]].Snakes));
    Rooms[RoomName[socket.id]].Snakes.push(NewSnake);
    socket.broadcast.to(Rooms[RoomName[socket.id]].id).emit('other_join',JSON.stringify(NewSnake));
    
    socket.on('eatfood',function(data, colorcount) {
      socket.broadcast.to(Rooms[RoomName[socket.id]].id).emit('other_eat', data, id, colorcount);
      for(var i = 0; i < Rooms[RoomName[socket.id]].Food.length; i++) {
        if (Rooms[RoomName[socket.id]].Food[i].id === data){
          Rooms[RoomName[socket.id]].Food.splice(i,1);
          break;
        }
      }
      if (Rooms[RoomName[socket.id]].Food.length <= 233) {
        var addfoodinfo = [];
        for(var i = 0; i <= 233-Rooms[RoomName[socket.id]].Food.length; i++) {
          var food_info = {};
          food_info.id = uuid.v1();
          food_info.x = Math.random() * (5000 - 10) + 10;
          food_info.y = Math.random() * (3000 - 10) + 10;
          food_info.intake = Math.round(Math.random() * 2) + 1;
          food_info.color = Math.round(Math.random() * 6);
          addfoodinfo.push(food_info);
          Rooms[RoomName[socket.id]].Food.push(food_info);
        }
        io.to(Rooms[RoomName[socket.id]].id).emit('add_food_for_num', JSON.stringify(addfoodinfo));
      }
    });

    socket.on('rebirth',function(id,length,num) {
      console.log(id);
      var newX = Math.random() * (5000 - 10 - 1920/2);
      var newY = Math.random() * (3000 - 10 - 1080/2);
      var newColor = [];
      for(var i =  0;i<length;i++) {
        var color = Math.round(Math.random() * 6);
        newColor.push(color);
      }
      for(var i = 0;i<Rooms[RoomName[socket.id]].Snakes.length;i++) {
        if(Rooms[RoomName[socket.id]].Snakes[i].id === id) {
          Rooms[RoomName[socket.id]].Snakes[i].body[i].x = newX;
          Rooms[RoomName[socket.id]].Snakes[i].body[i].y = newY;
        }
      }
      var addpoint = [];
      if (num > 0) {
        for (var i = 0; i < Math.round(num/2); i++){
          var color = Math.round(Math.random() * 6);
          var id2 = uuid.v1();
          info = {
            color: color,
            id: id2
          }
          addpoint.push(info);
        }
      }
      io.to(Rooms[RoomName[socket.id]].id).emit('rebirth',id,newX,newY,JSON.stringify(newColor),num,JSON.stringify(addpoint));
    });

    socket.on('move', function(data, id) {
      var position = JSON.parse(data);
      var snake_info = {
        id: id,
        body: position
      }
      Rooms[RoomName[socket.id]].Snakes.forEach(snake => {
        if(snake.id === id){
          snake.body = position;
          return;
        }
      });
      socket.broadcast.to(Rooms[RoomName[socket.id]].id).emit('move',JSON.stringify(snake_info));
    });



    socket.on('Drop',function(data) {
      
      var dropfood = JSON.parse(data);
      var returnfood = [];
      var bodyid = dropfood.id;
      for (var i = 0; i < 5; i++) {
        var food = {};
        var addfood = {};
        food.id = addfood.id = uuid.v1();
        var intake = Math.round(Math.random() * 2) + 1;
        food.intake = addfood.intake = intake;
        var randomAngle = Math.random()*(Math.PI);
        var randomLength = Math.random()*70;
        food.fromX = dropfood.x;
        food.fromY = dropfood.y;
        food.x = addfood.x = dropfood.x + randomLength*Math.cos(randomAngle);
        food.y = addfood.y = dropfood.y + randomLength*Math.sin(randomAngle);
        food.color = addfood.color = dropfood.color;
        returnfood.push(food);
        Rooms[RoomName[socket.id]].Food.push(addfood);
      }
      socket.emit('AnimateAddFood', JSON.stringify(returnfood), "true", id, bodyid);
      socket.broadcast.to(Rooms[RoomName[socket.id]].id).emit('AnimateAddFood', JSON.stringify(returnfood), "false", id, bodyid)
    });

    socket.on('disconnect', function(){
        console.log('a user leave');
        io.to(Rooms[RoomName[socket.id]].id).emit('disconnect',id);
        //删除房间或者客户端记录
        Rooms[RoomName[socket.id]].Snakes.splice(Rooms[RoomName[socket.id]].Snakes.indexOf(NewSnake), 1);
        for (var i = 0; i < Rooms[RoomName[socket.id]].sockets.length; i++) {
          if (Rooms[RoomName[socket.id]].sockets[i] == socket.id){
            Rooms[RoomName[socket.id]].sockets.splice(i, 1);
            if (Rooms[RoomName[socket.id]].sockets.length == 0) {
              Rooms.splice(RoomName[socket.id], i);
            }
            break;
          }
        }
        //分数插入数据库
        if (nowscore > laterscore) {
          var sql = "UPDATE rank SET score = "+nowscore+" WHERE name = '"+name+"';";
          connection.query(sql, function(err,result) {
            if(err) {
              console.log(err.message);
            }
            else {console.log('Update successfully');}
          });
        }
    });
    
    socket.on('afterEat', function(id, data) {
      var food_id = uuid.v1();
      socket.emit('own_add_point',data, food_id);
      socket.broadcast.to(Rooms[RoomName[socket.id]].id).emit('other_add_point', id, data, food_id);
    });
    //  新增分数实时统计
    socket.on("score", function(data) {
      nowscore = data;
    });

  });
});

http.listen(2222, function(){
  console.log('listening on *:2222');
});