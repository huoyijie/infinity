import { createServer } from 'http';
import { Server } from 'socket.io';
import msgpackParser from 'socket.io-msgpack-parser';
import path from 'path';

// 加载 .env 环境变量
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
var taskNum = 0;
var drawings = [];
var undos = [];
var moves = [];
setInterval(async () => {
  // 最多同时存在 5 个写数据库任务，最多占据 5 个数据库连接
  if (taskNum < 5) {
    if (undos.length > 0) {
      // 如果在队列中，则从队列中删除
      drawings = drawings.filter((drawing) => !undos.includes(drawing.strokeId));
      // 从数据库删除
      taskNum++;
      const strokeIds = undos;
      // 必须先清空缓存
      undos = [];
      await prisma.drawing.deleteMany({
        where: {
          strokeId: {
            in: strokeIds
          }
        }
      });
      taskNum--;
    }

    for (const { strokeId, delta: { x, y } } of moves) {
      taskNum++;
      await prisma.drawing.updateMany({
        where: { strokeId },
        data: {
          beginPointX: { increment: x },
          beginPointY: { increment: y },
          ctrlPointX: { increment: x },
          ctrlPointY: { increment: y },
          endPointX: { increment: x },
          endPointY: { increment: y },
        }
      });
      taskNum--;
    }

    if (drawings.length > 0) {
      taskNum++;
      const data = drawings;
      // 必须先清空缓存
      drawings = [];
      // 异步写入数据库
      await prisma.drawing.createMany({
        data,
        skipDuplicates: true,
      });
      taskNum--;
    }
  }
}, 10);

// 创建 http server
const httpServer = createServer();

// basePath must start with '/'
const basePath = process.env.BASE_PATH || '/';
const origin = process.env.ALLOW_ORIGIN || '*';
// 创建 socket.io server
const io = new Server(httpServer, {
  parser: msgpackParser,
  serveClient: false,
  path: path.join(basePath, 'socket.io'),
  cors: { origin }
});

// 新客户端连接
io.on('connection', async (socket) => {
  console.log(socket.id, 'connected');

  // 客户端打开画板后，立刻推送所有涂鸦数据
  socket.emit('drawings', await prisma.drawing.findMany({
    orderBy: [{ id: 'asc' }],
  }));

  // 收到新笔划
  socket.on('drawing', (drawing) => {
    // 广播给其他客户端
    socket.broadcast.emit('drawing', drawing);
    // 写入队列，然后异步写入数据库
    if (!drawing.end) {
      const { strokeId, pen, beginPoint, controlPoint, endPoint } = drawing;
      const { color, opacity, size } = pen;
      drawings.push({
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
      });
    }
  });

  // 撤销笔划
  socket.on('undo', (stroke) => {
    // 广播给其他客户端
    socket.broadcast.emit('undo', stroke);
    // 放入撤销队列
    undos.push(stroke.id);
  });

  // 移动笔划
  socket.on('move', (movement) => {
    // 广播给其他客户端
    socket.broadcast.emit('move', movement);
    // 放入移动队列
    moves.push(movement);
  });

  // 连接断开
  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnect');
  });
});

const port = process.env.PORT || 5000;
const host = process.env.HOST || 'localhost';
// 启动服务器
httpServer.listen(port, host, () => {
  console.log(`server listen on ${host}:${port}`);
});