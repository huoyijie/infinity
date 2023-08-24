import { createServer } from 'http';
import { Server } from 'socket.io';
import msgpackParser from 'socket.io-msgpack-parser';
import path from 'path';

// 加载 .env 环境变量
import { config } from 'dotenv';
config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
var drawings = [];
var undos = [];
var moves = [];
var copies = [];
var zooms = [];

setInterval(async () => {
  const promises = [];
  if (drawings.length > 0) {
    const data = drawings;
    // 必须先清空缓存
    drawings = [];
    // 异步写入数据库
    promises.push(prisma.drawing.createMany({
      data,
      skipDuplicates: true,
    }));
  }

  if (undos.length > 0) {
    // 如果在队列中，则从队列中删除
    drawings = drawings.filter((drawing) => !undos.includes(drawing.strokeId));
    // 从数据库删除
    const strokeIds = undos;
    // 必须先清空缓存
    undos = [];
    promises.push(prisma.drawing.deleteMany({
      where: {
        strokeId: { in: strokeIds }
      }
    }));
  }

  if (moves.length > 0) {
    const movements = moves;
    moves = [];

    const t = [];
    for (const { strokeId, delta: { x, y } } of movements) {
      t.push(prisma.drawing.updateMany({
        where: { strokeId },
        data: {
          beginPointX: { increment: x },
          beginPointY: { increment: y },
          ctrlPointX: { increment: x },
          ctrlPointY: { increment: y },
          endPointX: { increment: x },
          endPointY: { increment: y },
        }
      }));
    }
    promises.push(prisma.$transaction(t));
  }

  if (zooms.length > 0) {
    const zoomList = zooms;
    zooms = [];

    const t = [];
    for (const { strokeId, scale, delta: { x, y } } of zoomList) {
      const scaled = prisma.drawing.updateMany({
        where: { strokeId },
        data: {
          beginPointX: { multiply: scale },
          beginPointY: { multiply: scale },
          ctrlPointX: { multiply: scale },
          ctrlPointY: { multiply: scale },
          endPointX: { multiply: scale },
          endPointY: { multiply: scale },
        }
      });
      const processDelta = prisma.drawing.updateMany({
        where: { strokeId },
        data: {
          beginPointX: { decrement: x },
          beginPointY: { decrement: y },
          ctrlPointX: { decrement: x },
          ctrlPointY: { decrement: y },
          endPointX: { decrement: x },
          endPointY: { decrement: y },
        }
      });
      t.push(scaled, processDelta);
    }

    promises.push(prisma.$transaction(t));
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}, 5);

setInterval(async () => {
  if (copies.length > 0) {
    const copyList = copies;
    copies = [];

    const strokeIds = copyList.map(({ strokeId }) => strokeId);

    const srcDrawings = await prisma.drawing.findMany({
      where: { strokeId: { in: strokeIds } },
      orderBy: [{ id: 'asc' }],
    });

    const bulk = [];
    for (const { strokeId, newStrokeId } of copyList) {
      const drawings = srcDrawings
        .filter(({ strokeId: sid }) => sid === strokeId)
        .map(drawing => {
          const dstDrawing = { ...drawing };
          delete dstDrawing.id;
          dstDrawing.strokeId = newStrokeId;
          return dstDrawing;
        });
      bulk.push(...drawings);
    }

    await prisma.drawing.createMany({
      data: bulk,
      skipDuplicates: true,
    });
  }
}, 5);

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

  socket
    // 收到新笔划
    .on('drawing', (drawing) => {
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
    })
    // 撤销笔划
    .on('undo', (stroke) => {
      // 广播给其他客户端
      socket.broadcast.emit('undo', stroke);
      // 放入撤销队列
      undos.push(stroke.id);
    })
    // 删除笔划
    .on('delete', (strokes) => {
      // 广播给其他客户端
      socket.broadcast.emit('delete', strokes);
      // 放入撤销队列
      undos.push(...strokes.ids);
    })
    // 移动笔划
    .on('move', ({ strokeIds, delta }) => {
      // 广播给其他客户端
      socket.broadcast.emit('move', { strokeIds, delta });
      // 放入移动队列
      strokeIds.forEach(strokeId => moves.push({ strokeId, delta }));
    })
    // 复制笔划
    .on('copy', ({ strokeIds, newStrokeIds }) => {
      // 广播给其他客户端
      socket.broadcast.emit('copy', { strokeIds, newStrokeIds });
      // 放入复制队列
      strokeIds.forEach((strokeId, i) => copies.push({ strokeId, newStrokeId: newStrokeIds[i] }));
    })
    // 缩放笔划
    .on('zoom', ({ strokeIds, scale, delta }) => {
      // 广播给其他客户端
      socket.broadcast.emit('zoom', { strokeIds, scale, delta });
      strokeIds.forEach(strokeId => zooms.push({
        strokeId, scale, delta
      }));
    })
    // 连接断开
    .on('disconnect', () => {
      console.log(socket.id, 'disconnect');
    });
});

const port = process.env.PORT || 5000;
const host = process.env.HOST || 'localhost';
// 启动服务器
httpServer.listen(port, host, () => {
  console.log(`server listen on ${host}:${port}`);
});