import io from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { LazyBrush } from 'lazy-brush';
import { v4 as uuidv4 } from 'uuid';

const newStrokeId = () => uuidv4().replaceAll('-', '');

const WB = {
  // socket.io 连接句柄
  socket: null,

  // 画板和上下文
  canvas: null,
  ctx: null,
  draftCanvas: null,
  draftCtx: null,
  lbCanvas: null,
  lbCtx: null,

  // 根据不同状态设置鼠标样式，如正在涂鸦或者移动画板
  setCursor: null,

  // 画笔
  pen: {
    // 默认颜色
    color: 'black',
    opacity: 100,
    // 默认画笔粗细(逻辑)
    size: 10,
  },

  // 所有绘画数据
  drawings: new Map(),

  // 画板移动偏移量
  offsetX: 0,
  offsetY: 0,

  // 缩放因子，画板可缩小或者放大
  scale: 1,

  // 鼠标移动前坐标
  prevCursorX: 0,
  prevCursorY: 0,
  // 按住左键涂鸦
  leftMouseDown: false,
  // 按住右键移动画板
  rightMouseDown: false,
  // 通过滚轮控制放大 or 缩小画板

  // 触屏 (最多 2 个触点)
  prevTouches: [null, null],
  singleTouch: false,
  doubleTouch: false,

  // 线段的离线点集合
  currentStroke: null,
  points: [],
  // 起始点
  beginPoint: null,
  // Lazy Brush
  lazyBrush: new LazyBrush({
    enabled: true,
    radius: 10,
    initialPoint: { x: 0, y: 0 }
  }),

  // 初始化画板
  init(canvasRef, draftCanvasRef, lbCanvasRef, setCursor) {
    const that = this;
    // 获取画板元素及上下文对象
    this.canvas = canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
    this.draftCanvas = draftCanvasRef.current;
    this.draftCtx = this.draftCanvas.getContext('2d');
    this.lbCanvas = lbCanvasRef.current;
    this.lbCtx = this.lbCanvas.getContext('2d');

    // 当画板上进入不同状态时可通过此函数变换鼠标样式
    this.setCursor = setCursor;
    this.parseHash();

    // 添加鼠标事件处理
    this.lbCanvas.addEventListener('mousedown', onMouseDown, false);
    // 释放鼠标事件处理
    this.lbCanvas.addEventListener('mouseup', onMouseUp, false);
    this.lbCanvas.addEventListener('mouseout', onMouseUp, false);
    this.lbCanvas.addEventListener('mouseout', () => {
      that.drawBrush(true);
    }, false);
    this.lbCanvas.addEventListener('wheel', onMouseWheel, false);
    // 移动鼠标事件处理
    this.lbCanvas.addEventListener('mousemove', onMouseMove, false);

    // 添加手机触屏事件处理
    this.lbCanvas.addEventListener('touchstart', onTouchStart, false);
    this.lbCanvas.addEventListener('touchend', onTouchEnd, false);
    this.lbCanvas.addEventListener('touchcancel', onTouchEnd, false);
    this.lbCanvas.addEventListener('touchmove', onTouchMove, false);

    // 建立 socket.io 连接
    this.socket = io(process.env.NEXT_PUBLIC_SOCKETIO_URL || 'ws://localhost:4000', {
      parser: msgpackParser,
    });
    this.socket.on('drawing', (drawing) => {
      that.onRecvDrawing(drawing);
    })

    // window resize, redraw
    window.addEventListener('resize', () => {
      that.redraw();
    }, false);
    // 禁止右键唤起上下文菜单
    document.oncontextmenu = () => false;

    // 初始化画板
    this.redraw();
  },

  // 清理资源
  close() {
    this.socket.disconnect();
  },

  // 设置画笔颜色
  setColor(color) {
    this.pen.color = color;
    this.drawBrush();
  },

  // 设置画笔不透明度
  setOpacity(opacity) {
    this.pen.opacity = opacity;
  },

  // 设置画笔粗细
  setSize(size) {
    this.pen.size = size;
    this.drawBrush();
  },

  checkScale(scale) {
    const s = scale || this.scale;
    return s >= 0.1 && s <= 10;
  },

  hash() {
    return `#${this.offsetX.toFixed(0)},${this.offsetY.toFixed(0)},${this.scale.toFixed(1)}`;
  },

  parseHash() {
    const hash = location.hash.split('#')[1];
    if (hash) {
      const [offsetX, offsetY, scale] = hash.split(',');
      this.offsetX = (offsetX && Number(offsetX)) || 0;
      this.offsetY = (offsetY && Number(offsetY)) || 0;
      this.scale = (scale && Number(scale)) || 1;
      if (!this.checkScale()) {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
      }
      this.updateHash();
    }
  },

  updateHash() {
    location.hash = this.hash();
  },

  // 在最上面图层画 Brush
  drawBrush(clear) {
    this.lbCtx.clearRect(0, 0, this.lbCanvas.width, this.lbCanvas.height);
    if (clear) return;

    const { x, y } = WB.lazyBrush.getBrushCoordinates();
    this.lbCtx.beginPath();
    this.lbCtx.strokeStyle = this.pen.color;
    this.lbCtx.fillStyle = this.pen.color;
    this.lbCtx.arc(x, y, Math.max(this.toPenSize() / 2, 2), 0, Math.PI * 2);
    this.lbCtx.fill();
    this.lbCtx.stroke();
    this.lbCtx.closePath();
  },

  // 在中间 draft 图层画线段
  drawLine(pen, beginPoint, controlPoint, endPoint) {
    this.draftCtx.beginPath();
    this.draftCtx.strokeStyle = pen.color;
    this.draftCtx.lineWidth = pen.size;
    this.draftCtx.lineJoin = 'round';
    this.draftCtx.lineCap = 'round';
    this.draftCtx.moveTo(beginPoint.x, beginPoint.y);
    this.draftCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
    this.draftCtx.stroke();
    this.draftCtx.closePath();
  },

  // 从中间 draft 图层拷贝到最下方画板图层
  copyFromDraft(pen) {
    this.ctx.globalAlpha = (pen || this.pen).opacity / 100;
    this.ctx.drawImage(this.draftCanvas, 0, 0);
    this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
  },

  // 当从服务器接收到涂鸦数据，需要在画板上实时绘制
  onRecvDrawing(drawing) {
    if (!drawing.end) {
      // 保存绘画数据
      const stroke = this.drawings.get(drawing.strokeId) || [];
      stroke.push(drawing);
      this.drawings.set(drawing.strokeId, stroke);
    } else {
      const stroke = this.drawings.get(drawing.strokeId);
      if (stroke) {
        for (const drawing of stroke) {
          // 在 draft 图层上绘制笔划
          this.drawLine(
            this.toPen(drawing.pen),
            this.toPoint(drawing.beginPoint),
            this.toPoint(drawing.controlPoint),
            this.toPoint(drawing.endPoint),
          );
        }
        // 当前笔划结束后，拷贝 draft 图层到最下方画板图层
        this.copyFromDraft(drawing.pen);
      }
    }
  },

  // 每当移动画板、放大缩小画板、resize 窗口大小都需要重新绘制画板
  redraw() {
    // 设置画板长和宽为窗口大小
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;
    this.draftCanvas.width = document.body.clientWidth;
    this.draftCanvas.height = document.body.clientHeight;
    this.lbCanvas.width = document.body.clientWidth;
    this.lbCanvas.height = document.body.clientHeight;

    // 清空画板图层
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 所有笔划存储在 drawings 中
    for (const [_, stroke] of this.drawings) {
      // 在 draft 图层上绘制笔划
      for (const drawing of stroke) {
        this.drawLine(
          this.toPen(drawing.pen),
          this.toPoint(drawing.beginPoint),
          this.toPoint(drawing.controlPoint),
          this.toPoint(drawing.endPoint),
        );
      }
      // 拷贝到最下方画板图层
      this.copyFromDraft(stroke[0].pen);
    }
  },

  /* 坐标转换函数开始 */
  // 转换为实际 x 坐标
  toX(xL) {
    return (xL + this.offsetX) * this.scale;
  },

  toY(yL) {
    return (yL + this.offsetY) * this.scale;
  },

  toPoint({ x, y }) {
    return { x: this.toX(x), y: this.toY(y) };
  },

  toPenSize(size) {
    return (size || this.pen.size) * this.scale;
  },

  // 转为实际画笔
  toPen(lPen) {
    const { color, opacity, size } = lPen || this.pen;
    return {
      color,
      opacity,
      size: this.toPenSize(size),
    };
  },

  // 转换为逻辑坐标
  toLogicX(x) {
    return (x / this.scale) - this.offsetX;
  },

  toLogicY(y) {
    return (y / this.scale) - this.offsetY;
  },

  toLogicPoint({ x, y }) {
    return { x: this.toLogicX(x), y: this.toLogicY(y) };
  },

  // 逻辑画板高度
  logicHeight() {
    return this.canvas.height / this.scale;
  },

  // 逻辑画板宽度
  logicWidth() {
    return this.canvas.width / this.scale;
  },
  /* 坐标转换函数结束 */
};

/* 鼠标事件处理开始 */
const onMouseDown = (e) => {
  // 判断按键
  WB.leftMouseDown = e.button == 0;
  WB.rightMouseDown = e.button == 2;
  if (WB.leftMouseDown) {
    WB.beginPoint = WB.lazyBrush.getBrushCoordinates();
    WB.points.push(WB.beginPoint);
    WB.currentStroke = newStrokeId();
    WB.setCursor('crosshair');
  } else if (WB.rightMouseDown) {
    WB.setCursor('move');
  }
  // 更新鼠标移动前坐标
  WB.prevCursorX = e.pageX;
  WB.prevCursorY = e.pageY;
};

const onMouseMove = (e) => {
  // 更新移动后坐标
  const cursorX = e.pageX;
  const cursorY = e.pageY;

  // 按住左键移动鼠标进行涂鸦
  if (WB.lazyBrush.update({ x: e.pageX, y: e.pageY }) && WB.leftMouseDown) {
    WB.points.push(WB.lazyBrush.getBrushCoordinates());
    if (WB.points.length >= 3) {
      // 绘制笔划
      const lastTwoPoints = WB.points.slice(-2);
      const controlPoint = lastTwoPoints[0];
      const endPoint = {
        x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
        y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2,
      }
      WB.drawLine(WB.toPen(), WB.beginPoint, controlPoint, endPoint);

      const drawing = {
        strokeId: WB.currentStroke,
        pen: { ...WB.pen },
        beginPoint: WB.toLogicPoint(WB.beginPoint),
        controlPoint: WB.toLogicPoint(controlPoint),
        endPoint: WB.toLogicPoint(endPoint),
      };
      // 保存笔划
      const stroke = WB.drawings.get(drawing.strokeId) || [];
      stroke.push(drawing);
      WB.drawings.set(drawing.strokeId, stroke);
      // 把当前笔划发送到服务器
      WB.socket.emit('drawing', drawing);

      // 更新起始点
      WB.beginPoint = endPoint;
    }
  }

  // 画 brush
  WB.drawBrush();

  // 按住右键移动鼠标进行画板移动
  if (WB.rightMouseDown) {
    WB.offsetX += (cursorX - WB.prevCursorX) / WB.scale;
    WB.offsetY += (cursorY - WB.prevCursorY) / WB.scale;
    // 移动画板过程中会不断重新绘制
    WB.redraw();
  }

  // 更新移动前鼠标坐标为最新值
  WB.prevCursorX = cursorX;
  WB.prevCursorY = cursorY;
};

const onMouseUp = (e) => {
  if (WB.leftMouseDown) {
    // 发送笔划结束，不包含画笔和数据
    WB.socket.emit('drawing', {
      strokeId: WB.currentStroke,
      end: true,
      pen: { ...WB.pen },
    });
    WB.copyFromDraft();
    WB.leftMouseDown = false;
    WB.currentStroke = null;
    WB.beginPoint = null;
    WB.points = [];
  } else {
    WB.updateHash();
    WB.rightMouseDown = false;
  }
  // 恢复默认鼠标样式
  WB.setCursor(null);
};

const onMouseWheel = (e) => {
  const deltaY = e.deltaY;
  const scaleAmount = -deltaY / 500;

  if (!WB.checkScale(WB.scale * (1 + scaleAmount))) return;

  WB.scale *= (1 + scaleAmount);

  // 基于鼠标箭头位置决定怎样伸缩
  var distX = e.pageX / WB.canvas.width;
  var distY = e.pageY / WB.canvas.height;

  // 计算伸缩量
  const unitsZoomedX = WB.logicWidth() * scaleAmount;
  const unitsZoomedY = WB.logicHeight() * scaleAmount;

  const unitsAddLeft = unitsZoomedX * distX;
  const unitsAddTop = unitsZoomedY * distY;

  WB.offsetX -= unitsAddLeft;
  WB.offsetY -= unitsAddTop;

  WB.redraw();
  WB.drawBrush();
  WB.updateHash();
};
/* 鼠标事件处理结束 */

/* 触屏事件处理开始 */
const onTouchStart = (e) => {
  // 检测到一个触屏点为单手指
  WB.singleTouch = e.touches.length == 1;
  // 多于 2 个触点等同于 2 个，双手指
  WB.doubleTouch = e.touches.length > 1;
  // 只记录 2 个触点坐标
  WB.prevTouches[0] = e.touches[0];
  WB.prevTouches[1] = e.touches[1];
  if (WB.singleTouch) {
    WB.lazyBrush.update({ x: e.touches[0].pageX, y: e.touches[0].pageY });
    WB.currentStroke = newStrokeId();
    WB.beginPoint = WB.lazyBrush.getBrushCoordinates();
    WB.points.push(WB.beginPoint);
  }
};

const onTouchMove = (e) => {
  // 获取第 1 个触点坐标
  const touch0X = e.touches[0].pageX;
  const touch0Y = e.touches[0].pageY;
  const prevTouch0X = WB.prevTouches[0].pageX;
  const prevTouch0Y = WB.prevTouches[0].pageY;

  // 一根手指绘制笔划
  if (WB.lazyBrush.update({ x: touch0X, y: touch0Y }) && WB.singleTouch) {
    WB.points.push(WB.lazyBrush.getBrushCoordinates());
    if (WB.points.length >= 3) {
      // 绘制笔划
      const lastTwoPoints = WB.points.slice(-2);
      const controlPoint = lastTwoPoints[0];
      const endPoint = {
        x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
        y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2,
      }
      WB.drawLine(WB.toPen(), WB.beginPoint, controlPoint, endPoint);

      const drawing = {
        strokeId: WB.currentStroke,
        pen: { ...WB.pen },
        beginPoint: WB.toLogicPoint(WB.beginPoint),
        controlPoint: WB.toLogicPoint(controlPoint),
        endPoint: WB.toLogicPoint(endPoint),
      };

      // 保存笔划
      const stroke = WB.drawings.get(drawing.strokeId) || [];
      stroke.push(drawing);
      WB.drawings.set(drawing.strokeId, stroke);
      // 把当前笔划发送到服务器
      WB.socket.emit('drawing', drawing);

      // 更新起始点
      WB.beginPoint = endPoint;
    }
    WB.drawBrush();
  }

  // 两根以上手指移动或伸缩画板
  if (WB.doubleTouch) {
    // 获取第 2 个触点坐标
    const touch1X = e.touches[1].pageX;
    const touch1Y = e.touches[1].pageY;
    const prevTouch1X = WB.prevTouches[1].pageX;
    const prevTouch1Y = WB.prevTouches[1].pageY;

    // 获取 2 个触点中间坐标
    const midX = (touch0X + touch1X) / 2;
    const midY = (touch0Y + touch1Y) / 2;
    const prevMidX = (prevTouch0X + prevTouch1X) / 2;
    const prevMidY = (prevTouch0Y + prevTouch1Y) / 2;

    // 计算触点之间的距离
    const hypot = Math.sqrt(Math.pow((touch0X - touch1X), 2) + Math.pow((touch0Y - touch1Y), 2));
    const prevHypot = Math.sqrt(Math.pow((prevTouch0X - prevTouch1X), 2) + Math.pow((prevTouch0Y - prevTouch1Y), 2));

    // calculate the screen scale change
    const zoomAmount = hypot / prevHypot;
    if (WB.checkScale(WB.scale * zoomAmount)) {
      WB.scale *= zoomAmount;
      const scaleAmount = 1 - zoomAmount;
  
      // calculate how many pixels the midpoints have moved in the x and y direction
      const panX = midX - prevMidX;
      const panY = midY - prevMidY;
      // scale WB movement based on the zoom level
      WB.offsetX += (panX / WB.scale);
      WB.offsetY += (panY / WB.scale);
  
      // Get the relative position of the middle of the zoom.
      // 0, 0 would be top left. 
      // 0, 1 would be top right etc.
      const zoomRatioX = midX / WB.canvas.width;
      const zoomRatioY = midY / WB.canvas.height;
  
      // calculate the amounts zoomed from each edge of the screen
      const unitsZoomedX = WB.logicWidth() * scaleAmount;
      const unitsZoomedY = WB.logicHeight() * scaleAmount;
  
      const unitsAddLeft = unitsZoomedX * zoomRatioX;
      const unitsAddTop = unitsZoomedY * zoomRatioY;
  
      WB.offsetX += unitsAddLeft;
      WB.offsetY += unitsAddTop;
  
      WB.redraw();
      WB.drawBrush(true);
    }
  }

  // 更新触点坐标
  WB.prevTouches[0] = e.touches[0];
  WB.prevTouches[1] = e.touches[1];
};

const onTouchEnd = (e) => {
  if (WB.singleTouch) {
    // 发送笔划结束，不包含画笔和数据
    WB.socket.emit('drawing', {
      strokeId: WB.currentStroke,
      end: true,
      pen: { ...WB.pen },
    });
    WB.copyFromDraft();
    WB.singleTouch = false;
    WB.currentStroke = null;
    WB.beginPoint = null;
    WB.points = [];
  } else {
    WB.updateHash();
    WB.doubleTouch = false;
  }
};
/* 触屏事件处理结束 */

export default WB;