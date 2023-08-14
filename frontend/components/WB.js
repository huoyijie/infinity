import io from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { LazyBrush } from 'lazy-brush';
import { v4 as uuidv4 } from 'uuid';

// 通过 uuid 生成 stroke id
const newStrokeId = () => uuidv4().replaceAll('-', '');

export default {
  // socket.io 连接句柄
  socket: null,

  // 画板图层和上下文
  canvas: null,
  ctx: null,
  // 远程 recv 图层和上下文
  recvCanvas: null,
  recvCtx: null,
  // 本地 draft 图层和上下文
  draftCanvas: null,
  draftCtx: null,
  // lazy brush 图层和上下文
  lbCanvas: null,
  lbCtx: null,
  onLoad: () => { },
  onCursor: () => { },
  onClick: () => { },
  onCanUndo: () => { },

  // 根据不同状态设置鼠标样式，如正在涂鸦或者移动画板
  mode: 'move',

  // 画笔
  pen: {
    // 默认颜色
    color: 'black',
    // 不透明度
    opacity: 100,
    // 默认画笔粗细(逻辑)
    size: 10,
  },

  // 所有绘画数据
  strokes: null,
  drawings: null,
  history: null,

  // 画板移动偏移量
  offsetX: 0,
  offsetY: 0,

  // 缩放因子，画板可缩小或者放大
  scale: 1,

  // 鼠标移动前坐标
  prevCursorX: 0,
  prevCursorY: 0,
  leftMouseDown: false,

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
  init(canvasRef, recvCanvasRef, draftCanvasRef, lbCanvasRef, mode, onLoad, onCursor) {
    const that = this;
    // 获取画板元素及上下文对象
    this.canvas = canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
    this.recvCanvas = recvCanvasRef.current;
    this.recvCtx = this.recvCanvas.getContext('2d');
    this.draftCanvas = draftCanvasRef.current;
    this.draftCtx = this.draftCanvas.getContext('2d');
    this.lbCanvas = lbCanvasRef.current;
    this.lbCtx = this.lbCanvas.getContext('2d');

    // 初始化数据
    this.drawings = new Map();
    this.strokes = [];
    this.history = [];
    // 当画板上进入不同状态时可通过此函数变换鼠标样式
    this.mode = mode;
    this.onLoad = onLoad;
    this.onCursor = onCursor;
    // 从 URL hash 中解析三维坐标
    this.parseHash();

    // 添加鼠标事件处理
    this.lbCanvas.addEventListener('mousedown', (e) => that.mouseDown(e), false);
    // 移动鼠标事件处理
    this.lbCanvas.addEventListener('mousemove', (e) => that.mouseMove(e), false);
    // 释放鼠标事件处理
    this.lbCanvas.addEventListener('mouseup', (e) => that.mouseUp(), false);
    this.lbCanvas.addEventListener('mouseout', (e) => {
      that.mouseUp();
      that.drawBrush(true);
    }, false);
    // 滚轮缩放事件处理
    this.lbCanvas.addEventListener('wheel', (e) => that.mouseWheel(e), false);

    // 添加手机触屏事件处理
    this.lbCanvas.addEventListener('touchstart', (e) => that.touchStart(e), false);
    this.lbCanvas.addEventListener('touchmove', (e) => that.touchMove(e), false);
    this.lbCanvas.addEventListener('touchend', (e) => that.touchEnd(), false);
    this.lbCanvas.addEventListener('touchcancel', (e) => that.touchEnd(), false);

    this.lbCanvas.addEventListener('click', this.onClick);

    // 建立 socket.io 连接
    this.socket = io(process.env.NEXT_PUBLIC_SOCKETIO_URL || 'ws://localhost:4000', {
      parser: msgpackParser,
    });
    this.socket.on('drawings', (drawings) => {
      that.onRecvDrawings(drawings);
    });
    this.socket.on('drawing', (drawing) => {
      that.onRecvDrawing(drawing);
    })
    this.socket.on('undo', (stroke) => {
      that.onUndo(stroke);
    });

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

  // 设置模式
  setMode(mode) {
    this.mode = mode;
  },

  // 是否 erase 模式
  isErase() {
    return this.mode === 'erase';
  },

  // 是否 draw || erase 模式
  isDrawOrEraseMode() {
    return this.mode === 'draw' || this.isErase();
  },

  // 设置 draft 图层不透明度
  setDraftOpacity(opacity) {
    this.draftCanvas.style.opacity = (opacity || this.pen.opacity) + '%';
  },

  // 设置画笔颜色
  setColor(color) {
    this.pen.color = color;
    this.drawBrush();
  },

  // 设置画笔不透明度
  setOpacity(opacity) {
    this.pen.opacity = Number(opacity);
  },

  // 设置画笔粗细
  setSize(size) {
    this.pen.size = Number(size);
    this.drawBrush();
  },

  // 计算 wheel scale 阈值
  thresholdingWheelScale(scaleAmount) {
    const s = this.scale * (1 + scaleAmount);
    if (s < 0.1) {
      scaleAmount = 0.1 / this.scale - 1;
      this.scale = 0.1;
    } else if (s > 10) {
      scaleAmount = 10 / this.scale - 1;
      this.scale = 10;
    } else {
      this.scale = s;
    }
    return scaleAmount;
  },

  // 计算 touch scale 阈值
  thresholdingTouchScale(scaleAmount) {
    const s = this.scale * (1 - scaleAmount);
    if (s < 0.1) {
      scaleAmount = 1 - 0.1 / this.scale;
      this.scale = 0.1;
    } else if (s > 10) {
      scaleAmount = 1 - 10 / this.scale;
      this.scale = 10;
    } else {
      this.scale = s;
    }
    return scaleAmount;
  },

  // 计算当前三维坐标
  hash() {
    return `#${this.offsetX.toFixed(0)},${this.offsetY.toFixed(0)},${this.scale.toFixed(1)}`;
  },

  // 从 URL hash 中解析三维坐标
  parseHash() {
    const hash = location.hash.split('#')[1];
    if (hash) {
      const [offsetX, offsetY, scale] = hash.split(',');
      this.offsetX = (offsetX && Number(offsetX)) || 0;
      this.offsetY = (offsetY && Number(offsetY)) || 0;
      this.scale = (scale && Number(scale)) || 1;
      if (this.scale < 0.1 || this.scale > 10) {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
      }
      this.updateHash();
    }
  },

  // 更新 URL hash 中的三维坐标
  updateHash() {
    location.hash = this.hash();
  },

  // 在最上面图层画 Brush
  drawBrush(clear) {
    if (this.isDrawOrEraseMode()) {
      this.lbCtx.clearRect(0, 0, this.lbCanvas.width, this.lbCanvas.height);
      if (clear) return;

      const { x, y } = this.lazyBrush.getBrushCoordinates();
      this.lbCtx.beginPath();
      this.lbCtx.strokeStyle = this.pen.color;
      this.lbCtx.fillStyle = this.pen.color;
      this.lbCtx.arc(x, y, Math.max(this.toPenSize() / 2, 2), 0, Math.PI * 2);
      this.lbCtx.fill();
      this.lbCtx.stroke();
      this.lbCtx.closePath();
    }
  },

  // 在中间 draft 图层画线段
  drawLineOnDraft(pen, beginPoint, controlPoint, endPoint, isErase) {
    this.draftCtx.beginPath();
    this.draftCtx.strokeStyle = isErase ? 'white' : pen.color;
    this.draftCtx.lineWidth = pen.size;
    this.draftCtx.lineJoin = 'round';
    this.draftCtx.lineCap = 'round';
    this.draftCtx.moveTo(beginPoint.x, beginPoint.y);
    this.draftCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
    this.draftCtx.stroke();
    this.draftCtx.closePath();
  },

  // 从中间 draft 图层拷贝到最下方画板图层
  copyFromDraft({ pen, isErase }) {
    this.ctx.globalAlpha = isErase ? 1 : (pen || this.pen).opacity / 100;
    this.ctx.drawImage(this.draftCanvas, 0, 0);
    this.draftCtx.clearRect(0, 0, this.draftCanvas.width, this.draftCanvas.height);
  },

  // 在 recv 图层上画线
  drawLineOnRecv(pen, beginPoint, controlPoint, endPoint) {
    this.recvCtx.beginPath();
    this.recvCtx.strokeStyle = pen.color;
    this.recvCtx.lineWidth = pen.size;
    this.recvCtx.lineJoin = 'round';
    this.recvCtx.lineCap = 'round';
    this.recvCtx.moveTo(beginPoint.x, beginPoint.y);
    this.recvCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
    this.recvCtx.stroke();
    this.recvCtx.closePath();
  },

  // 从 Recv 图层拷贝笔划到最下方的画板图层
  copyFromRecv(pen) {
    this.ctx.globalAlpha = (pen || this.pen).opacity / 100;
    this.ctx.drawImage(this.recvCanvas, 0, 0);
    this.recvCtx.clearRect(0, 0, this.recvCanvas.width, this.recvCanvas.height);
  },

  // 当从服务器接收到涂鸦数据，需要在画板上实时绘制
  onRecvDrawing(drawing) {
    if (!drawing.end) {
      // 保存绘画数据
      const stroke = this.drawings.get(drawing.strokeId) || [];
      if (stroke.length === 0) {
        this.strokes.push(drawing.strokeId);
      }
      stroke.push(drawing);
      this.drawings.set(drawing.strokeId, stroke);
    } else {
      const stroke = this.drawings.get(drawing.strokeId);
      if (stroke && stroke.length > 0) {
        for (const drawing of stroke) {
          // 在 recv 图层上绘制笔划
          this.drawLineOnRecv(
            this.toPen(drawing.pen),
            this.toPoint(drawing.beginPoint),
            this.toPoint(drawing.controlPoint),
            this.toPoint(drawing.endPoint),
          );
        }
        // 当前笔划结束后，拷贝 recv 图层到最下方画板图层
        this.copyFromRecv(stroke[0].pen);
      }
    }
  },

  // 加载服务器数据，初始化画板
  onRecvDrawings(drawings) {
    for (const drawing of drawings) {
      const { strokeId, color, opacity, size, beginPointX, beginPointY, ctrlPointX, ctrlPointY, endPointX, endPointY } = drawing;
      const stroke = this.drawings.get(strokeId) || [];
      if (stroke.length === 0) {
        this.strokes.push(strokeId);
      }
      const pen = { color, opacity, size };
      const beginPoint = { x: beginPointX, y: beginPointY };
      const controlPoint = { x: ctrlPointX, y: ctrlPointY };
      const endPoint = { x: endPointX, y: endPointY };
      stroke.push({
        strokeId,
        pen,
        beginPoint,
        controlPoint,
        endPoint,
      });
      this.drawings.set(strokeId, stroke);
    }
    this.redraw();
    this.onLoad();
  },

  // 收到远程撤销笔划
  onUndo(stroke) {
    this.drawings.delete(stroke.id);
    this.strokes = this.strokes.filter((strokeId) => strokeId !== stroke.id);
    this.redraw();
  },

  // 每当移动画板、放大缩小画板、resize 窗口大小都需要重新绘制画板
  redraw() {
    // 设置画板长和宽为窗口大小
    const { clientWidth, clientHeight } = document.body;
    this.canvas.width = clientWidth;
    this.canvas.height = clientHeight;
    this.recvCanvas.width = clientWidth;
    this.recvCanvas.height = clientHeight;
    this.draftCanvas.width = clientWidth;
    this.draftCanvas.height = clientHeight;
    this.lbCanvas.width = clientWidth;
    this.lbCanvas.height = clientHeight;

    // 清空画板图层
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 所有笔划存储在 drawings 中
    for (const strokeId of this.strokes) {
      const stroke = this.drawings.get(strokeId);
      let drawn = false;
      // 在 draft 图层上绘制笔划
      for (const { pen, beginPoint, controlPoint, endPoint } of stroke) {
        if (this.isLogicPointVisible(beginPoint) && this.isLogicPointVisible(controlPoint) && this.isLogicPointVisible(endPoint)) {
          this.drawLineOnDraft(
            this.toPen(pen),
            this.toPoint(beginPoint),
            this.toPoint(controlPoint),
            this.toPoint(endPoint),
          );
          drawn = true;
        }
      }
      // 拷贝到最下方画板图层
      drawn && this.copyFromDraft({ pen: stroke[0].pen });
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

  // 逻辑点是否在可视窗口范围内
  isLogicPointVisible(point) {
    const { x, y } = this.toPoint(point);
    return x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height;
  },
  /* 坐标转换函数结束 */

  /* 鼠标事件处理开始 */
  mouseDown(e) {
    // 是否按下鼠标左键
    this.leftMouseDown = e.button === 0;
    if (this.leftMouseDown) {
      if (this.isDrawOrEraseMode()) {
        if (this.isErase()) {
          this.setDraftOpacity(100);
        }
        this.beginPoint = this.lazyBrush.getBrushCoordinates();
        this.points.push(this.beginPoint);
        this.currentStroke = newStrokeId();
        this.onCursor('none');
      } else if (this.mode === 'move') {
        this.onCursor('move');
      }
    }
    // 更新鼠标移动前坐标
    this.prevCursorX = e.pageX;
    this.prevCursorY = e.pageY;
  },

  mouseMove(e) {
    // 更新移动后坐标
    const cursorX = e.pageX;
    const cursorY = e.pageY;

    // draw 涂鸦模式
    if (this.lazyBrush.update({ x: e.pageX, y: e.pageY }) && this.isDrawOrEraseMode() && this.leftMouseDown) {
      this.points.push(this.lazyBrush.getBrushCoordinates());
      if (this.points.length >= 3) {
        // 绘制笔划
        const lastTwoPoints = this.points.slice(-2);
        const controlPoint = lastTwoPoints[0];
        const endPoint = {
          x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
          y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2,
        }
        this.drawLineOnDraft(this.toPen(), this.beginPoint, controlPoint, endPoint, this.isErase());

        const { color, opacity, size } = this.pen;
        const drawing = {
          strokeId: this.currentStroke,
          pen: { color: this.isErase() ? 'white' : color, opacity: this.isErase() ? 100 : opacity, size },
          beginPoint: this.toLogicPoint(this.beginPoint),
          controlPoint: this.toLogicPoint(controlPoint),
          endPoint: this.toLogicPoint(endPoint),
        };
        // 保存笔划
        const stroke = this.drawings.get(drawing.strokeId) || [];
        // 记录笔划 history
        if (stroke.length === 0) {
          this.strokes.push(drawing.strokeId);
          this.history.push(drawing.strokeId);
          this.onCanUndo(true);
        }
        stroke.push(drawing);
        this.drawings.set(drawing.strokeId, stroke);
        // 把当前笔划发送到服务器
        this.socket.emit('drawing', drawing);

        // 更新起始点
        this.beginPoint = endPoint;
      }
    }

    // move 移动模式
    if (this.mode === 'move' && this.leftMouseDown) {
      this.offsetX += (cursorX - this.prevCursorX) / this.scale;
      this.offsetY += (cursorY - this.prevCursorY) / this.scale;
      this.updateHash();
      // 移动画板过程中会不断重新绘制
      this.redraw();
    }

    // 画 brush
    this.drawBrush();

    // 更新移动前鼠标坐标为最新值
    this.prevCursorX = cursorX;
    this.prevCursorY = cursorY;
  },

  mouseUp() {
    if (this.leftMouseDown) {
      if (this.isDrawOrEraseMode()) {
        // 发送笔划结束，不包含画笔和数据
        this.socket.emit('drawing', {
          strokeId: this.currentStroke,
          end: true,
        });
        this.copyFromDraft({ isErase: this.isErase() });
        if (this.isErase()) {
          this.setDraftOpacity();
        }
        this.currentStroke = null;
        this.beginPoint = null;
        this.points = [];
      } else if (this.mode === 'move') {
        this.updateHash();
      }
      this.leftMouseDown = false;
    }
    // 恢复默认鼠标样式
    this.onCursor(null);
  },

  mouseWheel(e) {
    const scaleAmount = this.thresholdingWheelScale(-e.deltaY / 4800);

    // 基于鼠标箭头位置决定怎样伸缩
    var distX = e.pageX / this.canvas.width;
    var distY = e.pageY / this.canvas.height;

    // 计算伸缩量
    const unitsZoomedX = this.logicWidth() * scaleAmount;
    const unitsZoomedY = this.logicHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redraw();
    this.drawBrush();
    this.updateHash();
  },
  /* 鼠标事件处理结束 */
  /* 触屏事件处理开始 */
  touchStart(e) {
    // 检测到一个触屏点为单手指
    this.singleTouch = e.touches.length == 1;
    // 多于 2 个触点等同于 2 个，双手指
    this.doubleTouch = e.touches.length > 1;
    // 只记录 2 个触点坐标
    this.prevTouches[0] = e.touches[0];
    this.prevTouches[1] = e.touches[1];
    if (this.singleTouch && this.isDrawOrEraseMode()) {
      if (this.isErase()) {
        this.setDraftOpacity(100);
      }
      this.lazyBrush.update({ x: e.touches[0].pageX, y: e.touches[0].pageY });
      this.beginPoint = this.lazyBrush.getBrushCoordinates();
      this.points.push(this.beginPoint);
      this.currentStroke = newStrokeId();
    }
  },

  touchMove(e) {
    // 获取第 1 个触点坐标
    const touch0X = e.touches[0].pageX;
    const touch0Y = e.touches[0].pageY;
    const prevTouch0X = this.prevTouches[0].pageX;
    const prevTouch0Y = this.prevTouches[0].pageY;

    // draw 涂鸦模式
    if (this.lazyBrush.update({ x: touch0X, y: touch0Y }) && this.isDrawOrEraseMode() && this.singleTouch) {
      this.points.push(this.lazyBrush.getBrushCoordinates());
      if (this.points.length >= 3) {
        // 绘制笔划
        const lastTwoPoints = this.points.slice(-2);
        const controlPoint = lastTwoPoints[0];
        const endPoint = {
          x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
          y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2,
        }
        this.drawLineOnDraft(this.toPen(), this.beginPoint, controlPoint, endPoint, this.isErase());

        const { color, opacity, size } = this.pen;
        const drawing = {
          strokeId: this.currentStroke,
          pen: { color: this.isErase() ? 'white' : color, opacity: this.isErase() ? 100 : opacity, size },
          beginPoint: this.toLogicPoint(this.beginPoint),
          controlPoint: this.toLogicPoint(controlPoint),
          endPoint: this.toLogicPoint(endPoint),
        };

        // 保存笔划
        const stroke = this.drawings.get(drawing.strokeId) || [];
        // 记录笔划 history
        if (stroke.length === 0) {
          this.strokes.push(drawing.strokeId);
          this.history.push(drawing.strokeId);
          this.onCanUndo(true);
        }
        stroke.push(drawing);
        this.drawings.set(drawing.strokeId, stroke);
        // 把当前笔划发送到服务器
        this.socket.emit('drawing', drawing);

        // 更新起始点
        this.beginPoint = endPoint;
      }
      this.drawBrush();
    }

    // move 移动模式
    if (this.mode === 'move' && this.singleTouch) {
      // 计算 2 个触点的中间点在 x, y 两轴方向的位移
      const panX = touch0X - prevTouch0X;
      const panY = touch0Y - prevTouch0Y;
      // 累加此次移动带来的偏移量
      this.offsetX += (panX / this.scale);
      this.offsetY += (panY / this.scale);
      this.updateHash();
      // 移动画板过程中会不断重新绘制
      this.redraw();
    }

    // 两根以上手指伸缩画板
    if (this.doubleTouch) {
      // 获取第 2 个触点坐标
      const touch1X = e.touches[1].pageX;
      const touch1Y = e.touches[1].pageY;
      const prevTouch1X = this.prevTouches[1].pageX;
      const prevTouch1Y = this.prevTouches[1].pageY;

      // 获取 2 个触点中间坐标
      const midX = (touch0X + touch1X) / 2;
      const midY = (touch0Y + touch1Y) / 2;

      // 计算触点之间的距离
      const hypot = Math.sqrt(Math.pow((touch0X - touch1X), 2) + Math.pow((touch0Y - touch1Y), 2));
      const prevHypot = Math.sqrt(Math.pow((prevTouch0X - prevTouch1X), 2) + Math.pow((prevTouch0Y - prevTouch1Y), 2));

      const zoomAmount = hypot / prevHypot;
      // 计算屏幕伸缩量
      const scaleAmount = this.thresholdingTouchScale(1 - zoomAmount);

      // 计算 x, y 轴单位伸缩值
      const unitsZoomedX = this.logicWidth() * scaleAmount;
      const unitsZoomedY = this.logicHeight() * scaleAmount;

      // 以移动后的当前 2 个触点的中间点为中心进行伸缩
      const zoomRatioX = midX / this.canvas.width;
      const zoomRatioY = midY / this.canvas.height;

      // 伸缩带来的偏移量
      const unitsAddLeft = unitsZoomedX * zoomRatioX;
      const unitsAddTop = unitsZoomedY * zoomRatioY;

      // 累加此次伸缩带来的偏移量
      this.offsetX += unitsAddLeft;
      this.offsetY += unitsAddTop;

      this.updateHash();
      this.redraw();
      this.drawBrush(true);
    }

    // 更新触点坐标
    this.prevTouches[0] = e.touches[0];
    this.prevTouches[1] = e.touches[1];
  },

  touchEnd() {
    if (this.singleTouch) {
      // 发送笔划结束，不包含画笔和数据
      this.socket.emit('drawing', {
        strokeId: this.currentStroke,
        end: true,
      });
      this.copyFromDraft({ isErase: this.isErase() });
      if (this.isErase()) {
        this.setDraftOpacity();
      }
      this.singleTouch = false;
      this.currentStroke = null;
      this.beginPoint = null;
      this.points = [];
    } else {
      this.updateHash();
      this.doubleTouch = false;
    }
  },
  /* 触屏事件处理结束 */

  // 撤销最后一次笔划
  undo() {
    const lastStroke = this.history.pop();
    if (lastStroke) {
      if (this.history.length === 0) {
        this.onCanUndo(false);
      }
      this.drawings.delete(lastStroke);
      this.strokes = this.strokes.filter((strokeId) => strokeId !== lastStroke);
      // 发送服务器，撤销此笔划
      this.socket.emit('undo', {
        id: lastStroke
      });
      this.redraw();
    }
  }
};