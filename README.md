# An easy to use whiteboard

## 控制画线平滑的算法

* 二次贝塞尔曲线 (quadraticCurveTo)
* 鼠标移动过程中进行坐标点采样，如果设置不透明度，坐标点过于密集会影响效果

## Lazy-brush

[Demo](https://lazybrush.dulnan.net/)

[GitHub](https://github.com/dulnan/lazy-brush)

For an app where users can draw on a canvas, I was looking for a way to make it easy to draw smooth curves and lines.

The usual way to do this seems to be to calculate additional points between those coming from mousemove or touchmove events. Though this works quite well, it can still get jittery when the mouse is moved slowly. In addition, it doesn't provide good feedback to the user and sometimes reduces precision.

Another way to approach this: Decouple the brush from the mouse, so that the mouse pulls the brush, as if they were connected by a chain. Some drawing (desktop) apps or plugins seem to provide such a feature, but a publicly visible implementation in JavaScript or actually any language seems to not exist. So let's do it ourselves.

The math
It is actually surprisingly simple: Define a "lazy radius" around the brush, let's say 100px. Now every time the mouse moves, check the distance between mouse and brush. If this distance is 105px, move the brush by 5px in the direction of the mouse. To achieve this, you have to calculate the angle between mouse and brush. With the angle and the difference, using a bit of sine and cosine, you can determine the new coordinates for the brush.

Implementation
I have implemented exactly this in the form of a small library. It should be easy to integrate into existing canvas drawing apps. Its update function will return a boolean to indicate if the mouse has moved the brush or not. If it did and if the user is pressing the mouse button, the movement can be drawn on the canvas context.

When drawing on the context, you can still use the usual techniques to make movement smoother, like interpolating points. All this together provides a really good way to draw with a mouse or finger.

Checkout the code in the GitHub repository to see how exactly the calculations work. The demo/example repository can be found here: https://github.com/dulnan/lazy-brush-demo

## Drawing on canvas with opacity (dots in line)

[Question](https://stackoverflow.com/questions/29072686/drawing-on-canvas-with-opacity-dots-in-line-javascript)

Yes, that is to be expected as each line is overdrawn at the connection points, and their alpha data will add up.

I would suggest the following approach and attach a proof-of-concept demo at the end, feel free to adopt that code to your project:

1. Create two canvases, one main and one draft on top
2. Set the alpha directly on the top element using CSS (opacity) and always keep globalAlpha=1
3. For each stroke (pen down, pen up) draw on draft canvas (use lines between each point)
4. On pen up, set globalAlpha on main canvas equal the CSS opacity of top canvas
5. Draw top canvas to main canvas using drawImage().
6. Clear top canvas, eat, sleep, repeat (from 3).

## 地址栏显示坐标及 scale，三维空间

* hash, x,y,scale
* scale 上下限制

## 实时显示远程 peer 坐标和颜色等，实时显示远程 peer 笔划过程，现在粒度比较粗，一个笔划是同时显示出来，没有过程。

## 重构代码

* refactor WB.js
* socket.io msgpack

## Bugfix

* 刷新页面后，通过网络查看到 2 个 websocket 连接 done

```js
useEffect(() => {
  WB.init(canvasRef, setCursor);
  // 需返回清理回调，及时关闭 websocket 连接
  return () => WB.close();
}, []);
```

## 环境变量

### backend

* PORT

### frontend

* NEXT_PUBLIC_SOCKETIO_URL=ws://192.168.31.53:5000