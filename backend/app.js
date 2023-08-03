import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
// 定义静态资源路径
app.use(express.static('public'));

// 创建 http server
const httpServer = createServer(app);

// 创建 socket.io server
const io = new Server(httpServer, {
  serveClient: false,
  cors: {
    origin: "http://localhost:3000"
  }
});

// 新客户端连接
io.on('connection', (socket) => {
  // 收到客户端新笔划请求
  socket.on('drawing', (drawing) => {
    // 广播给其他客户端
    socket.broadcast.emit('drawing', drawing);
  });
});

// 启动服务器，监听 4000 端口
httpServer.listen(4000);
console.log('click http://localhost:4000');