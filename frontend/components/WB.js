import io from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { LazyBrush } from 'lazy-brush';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import measureBezier from 'is-hit-quadratic-bezier';

// 通过 uuid 生成 stroke id
const newStrokeId = () => uuidv4().replaceAll('-', '');

// 回调限流: 至少间隔 delay 毫秒才会调用事件处理回调函数
const throttle = (func, delay) => {
  let previousCall = new Date().getTime();
  return function () {
    // force call func
    const { force } = arguments[0];
    const time = new Date().getTime();
    if (force || (time - previousCall) >= delay) {
      previousCall = time;
      func.apply(null, arguments);
    }
  };
}

const replaceHash = throttle(({ hash }) => location.replace(hash), 100);

const redrawWithThrottle = throttle((WB) => WB.redraw(), 200);

export default {
  // socket.io 连接句柄
  socket: null,

  // 画板图层和上下文
  canvas: null,
  ctx: null,
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
  pen: {},

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
  init(canvasRef, draftCanvasRef, lbCanvasRef, mode, { opacity }, onLoad, onCursor) {
    const that = this;
    // 获取画板元素及上下文对象
    this.canvas = canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
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
    this.pen.opacity = opacity;
    this.onLoad = onLoad;
    this.onCursor = onCursor;
    // 从 URL hash 中解析三维坐标
    this.parseHash();

    // 添加鼠标事件处理
    this.lbCanvas.onmousedown = (e) => that.mouseDown(e);
    // 移动鼠标事件处理
    this.lbCanvas.onmousemove = throttle((e) => that.mouseMove(e), 20);
    // 释放鼠标事件处理
    this.lbCanvas.onmouseup = () => that.mouseUp();
    this.lbCanvas.onmouseout = () => {
      that.mouseUp();
      that.drawBrush(true);
    };
    // 滚轮缩放事件处理
    this.lbCanvas.onwheel = throttle((e) => that.mouseWheel(e), 50);

    // 添加手机触屏事件处理
    this.lbCanvas.ontouchstart = (e) => that.touchStart(e);
    this.lbCanvas.ontouchmove = throttle((e) => that.touchMove(e), 20);
    this.lbCanvas.ontouchend = () => that.touchEnd();
    this.lbCanvas.ontouchcancel = () => that.touchEnd();

    this.lbCanvas.onclick = (e) => that.tap(e);

    const socketioUrl = process.env.NEXT_PUBLIC_SOCKETIO_URL || 'ws://localhost:5000';
    // basePath must start with '/'
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/';
    // 建立 socket.io 连接
    this.socket = io(socketioUrl, {
      parser: msgpackParser,
      path: path.join(basePath, 'socket.io')
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
    window.onresize = () => that.redraw();
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
      this.updateHash(true);
    }
  },

  // 更新 URL hash 中的三维坐标
  updateHash(force) {
    replaceHash({ force, hash: this.hash() });
  },

  // 在最上面图层画 Brush
  drawBrush(clear) {
    if (this.isDrawOrEraseMode()) {
      this.lbCtx.clearRect(0, 0, this.lbCanvas.width, this.lbCanvas.height);
      if (clear) return;

      const { x, y } = this.lazyBrush.getBrushCoordinates();
      // 2*r is a little larger then pen size
      const r = this.toPenSize() / 1.5;
      const { color } = this.pen;
      this.lbCtx.fillStyle = color;
      this.lbCtx.beginPath();
      this.lbCtx.arc(x, y, r, 0, Math.PI * 2);
      this.lbCtx.fill();
    }
  },

  // 在中间 draft 图层画线段
  drawLineOnDraft({ color, size }, beginPoint, controlPoint, endPoint, isErase) {
    this.draftCtx.beginPath();
    this.draftCtx.strokeStyle = isErase ? 'white' : color;
    this.draftCtx.lineWidth = size;
    this.draftCtx.lineJoin = 'round';
    this.draftCtx.lineCap = 'round';
    this.draftCtx.moveTo(beginPoint.x, beginPoint.y);
    this.draftCtx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
    this.draftCtx.stroke();
  },

  // 从中间 draft 图层拷贝到最下方画板图层
  copyFromDraft({ pen, isErase }) {
    this.ctx.globalAlpha = isErase ? 1 : (pen || this.pen).opacity / 100;
    this.ctx.drawImage(this.draftCanvas, 0, 0);
    this.draftCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  /** 最下方画板图层操作 start */
  // 设置上下文
  setContext({ color, opacity, size }) {
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = opacity / 100;
    this.ctx.lineWidth = size;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
  },

  // 画线
  drawLine(bp, cp, ep) {
    this.ctx.moveTo(bp.x, bp.y);
    this.ctx.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
  },

  // 绘制笔划
  drawStroke(stroke) {
    if (stroke && stroke.length > 0) {
      const visible = [];
      for (const { beginPoint, controlPoint, endPoint } of stroke) {
        let bp, cp, ep;
        if (this.isPointVisible(bp = this.toPoint(beginPoint)) || this.isPointVisible(cp = this.toPoint(controlPoint)) || this.isPointVisible(ep = this.toPoint(endPoint))) {
          if (!cp) cp = this.toPoint(controlPoint);
          if (!ep) ep = this.toPoint(endPoint);
          visible.push({ bp, cp, ep });
        }
      }
      if (visible.length > 0) {
        this.setContext(this.toPen(stroke[0].pen));
        this.ctx.beginPath();
        for (const { bp, cp, ep } of visible) {
          this.drawLine(bp, cp, ep);
        }
        this.ctx.stroke();
      }
    }
  },

  // 绘制所有笔划
  drawStrokes() {
    for (const strokeId of this.strokes) {
      this.drawStroke(this.drawings.get(strokeId));
    }
  },

  // 更新 stroke，并计算 stroke 显示区域
  updateStroke(strokeId, drawing, draft) {
    const stroke = this.drawings.get(strokeId) || [];

    const { beginPoint: { x, y } } = drawing;
    if (!stroke.inf_area) {
      stroke.inf_area = { x0: x, y0: y, x1: x, y1: y };
    } else {
      if (x < stroke.inf_area.x0) {
        stroke.inf_area.x0 = x;
      } else if (x > stroke.inf_area.x1) {
        stroke.inf_area.x1 = x;
      }
      if (y < stroke.inf_area.y0) {
        stroke.inf_area.y0 = y;
      } else if (y > stroke.inf_area.y1) {
        stroke.inf_area.y1 = y;
      }
    }

    stroke.push(drawing);
    if (stroke.length === 1) {
      this.strokes.push(strokeId);
      if (draft) {
        this.history.push(strokeId);
        this.onCanUndo(true);
      }
    }
    this.drawings.set(strokeId, stroke);
  },
  /** 最下方画板图层操作 end */

  // 当从服务器接收到涂鸦数据，需要在画板上实时绘制
  onRecvDrawing(drawing) {
    const { end, strokeId } = drawing;
    if (!end) {
      this.updateStroke(strokeId, drawing);
    } else {
      this.drawStroke(this.drawings.get(strokeId));
    }
  },

  // 加载服务器数据，初始化画板
  onRecvDrawings(drawings) {
    for (const drawing of drawings) {
      const { strokeId, color, opacity, size, beginPointX, beginPointY, ctrlPointX, ctrlPointY, endPointX, endPointY } = drawing;
      const pen = { color, opacity, size };
      const beginPoint = { x: beginPointX, y: beginPointY };
      const controlPoint = { x: ctrlPointX, y: ctrlPointY };
      const endPoint = { x: endPointX, y: endPointY };
      this.updateStroke(strokeId, {
        strokeId,
        pen,
        beginPoint,
        controlPoint,
        endPoint,
      });
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
    this.draftCanvas.width = clientWidth;
    this.draftCanvas.height = clientHeight;
    this.lbCanvas.width = clientWidth;
    this.lbCanvas.height = clientHeight;

    // 清空画板图层
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 绘制所有笔划
    this.drawStrokes();
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

  // 是否在可视窗口范围内
  isPointVisible({ x, y }) {
    return x >= 0 && x <= this.canvas.width && y >= 0 && y <= this.canvas.height;
  },
  /* 坐标转换函数结束 */

  /* 鼠标事件处理开始 */
  mouseDown(e) {
    this.onClick();
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
        this.updateStroke(drawing.strokeId, drawing, true);
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
      redrawWithThrottle(this);
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
    this.onClick();
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
    this.onClick();
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
        this.updateStroke(drawing.strokeId, drawing, true);
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
      redrawWithThrottle(this);
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

  // 点击事件处理
  tap(e) {
    if (this.mode === 'select') {
      const selected = [];
      const p = this.toLogicPoint({ x: e.pageX, y: e.pageY });
      for (const strokeId of this.strokes) {
        const stroke = this.drawings.get(strokeId);
        const { inf_area: { x0, y0, x1, y1 } } = stroke;
        if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
          for (const { beginPoint, controlPoint, endPoint, pen } of stroke) {
            const { isHit } = measureBezier(beginPoint, controlPoint, endPoint);
            const distance = Math.min(this.toPen(pen).size, 20);
            if (isHit(p, distance)) {
              selected.push(stroke);
              break;
            }
          }
        }
      }
      for (const { inf_area: { x0, y0, x1, y1 } } of selected) {
        console.log(this.toX(x0), this.toY(y0), this.toX(x1), this.toY(y1));
      }
    }
  },

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