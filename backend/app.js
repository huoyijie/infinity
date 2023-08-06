import { createServer } from 'http';
import { Server } from 'socket.io';

// 加载 .env 环境变量
import { config } from 'dotenv';
config();

// 创建 http server
const httpServer = createServer();

// 创建 socket.io server
const io = new Server(httpServer, {
  serveClient: false,
  cors: {
    origin: '*'
  }
});

// 新客户端连接
io.on('connection', (socket) => {
  console.log(socket.id, 'connected');
  // 收到客户端新笔划请求
  socket.on('drawing', (drawing) => {
    // 广播给其他客户端
    socket.broadcast.emit('drawing', drawing);
  });
  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnect');
  });
});

// 启动服务器
httpServer.listen(process.env.PORT);