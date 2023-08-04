# An easy to use whiteboard

## 控制画线平滑的算法

* 二次贝塞尔曲线 (quadraticCurveTo)
* 鼠标移动过程中进行坐标点采样，如果设置不透明度，坐标点过于密集会影响效果

## 地址栏显示坐标及 scale，三维空间

* hash, x,y,scale

## 重构代码

* refactor WB.js

## Bugfix

* 刷新页面后，通过网络查看到 2 个 websocket 连接

```js
useEffect(() => {
  WB.init(canvasRef, setCursor);
  // 需返回清理回调，及时关闭 websocket 连接
  return () => WB.close();
}, []);
```