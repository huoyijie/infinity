import { createServer } from 'http';
import { Server } from 'socket.io';
import msgpackParser from 'socket.io-msgpack-parser';

// 加载 .env 环境变量
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// 创建 http server
const httpServer = createServer();

// 创建 socket.io server
const io = new Server(httpServer, {
  parser: msgpackParser,
  serveClient: false,
  cors: {
    origin: '*'
  }
});

// 新客户端连接
io.on('connection', async (socket) => {
  console.log(socket.id, 'connected');
  // 收到客户端新笔划请求
  socket.on('drawing', async (drawing) => {
    // 广播给其他客户端
    socket.broadcast.emit('drawing', drawing);
    if (!drawing.end) {
      const { strokeId, pen, beginPoint, controlPoint, endPoint } = drawing;
      const { color, opacity, size } = pen;
      await prisma.drawing.create({
        data: {
          strokeId,
          color,
          opacity,
          size,
          beginPointX: beginPoint.x,
          beginPointY: beginPoint.y,
          ctrlPointX: controlPoint.x,
          ctrlPointY: controlPoint.y,
          endPointX: endPoint.x,
          endPointY: endPoint.y,
        },
      });
    }
  });
  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnect');
  });
  socket.emit('drawings', await prisma.drawing.findMany());
});

// 启动服务器
httpServer.listen(process.env.PORT || 4000);