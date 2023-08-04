# An easy to use whiteboard

## 控制画线平滑的算法

* 二次贝塞尔曲线 (quadraticCurveTo)
* 鼠标移动过程中进行坐标点采样，如果设置不透明度，坐标点过于密集会影响效果

## 地址栏显示坐标及 scale，三维空间

* hash, x,y,scale

## 重构代码

* refactor WB.js

## Bugfix

* 刷新页面后，通过网络查看到 2 个 websocket 连接 done

```js
useEffect(() => {
  WB.init(canvasRef, setCursor);
  // 需返回清理回调，及时关闭 websocket 连接
  return () => WB.close();
}, []);
```

* hotreload 没有执行 WB.close todo

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