import { useRef, useState, useEffect } from 'react';
import WB from './WB';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => WB.init(canvasRef, setCursor), []);

  const canvasClass = () => {
    let c = 'w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  const colorClass = (color) => {
    let c = 'inline-block w-16 h-16';
    if (color === 'black') {
      c += ' bg-black';
    } else {
      c += ` bg-${color}-500`;
    }
    if (selectedColor === color) {
      c += ' border-4 border-white';
    }
    return c;
  };

  // 点击颜色组件选色处理函数
  const selectColor = (color) => {
    setSelectedColor(color);
    WB.setColor(color);
  };
  return (
    <>
      {/* 画板 */}
      <canvas ref={canvasRef} id="canvas" className={canvasClass()}></canvas>
      {/* 画笔颜色选择 */}
      <div className="fixed top-0 left-0">
        <div className={colorClass('black')} onClick={() => selectColor('black')}></div>
        <div className={colorClass('red')} onClick={() => selectColor('red')}></div>
        <div className={colorClass('green')} onClick={() => selectColor('green')}></div>
        <div className={colorClass('blue')} onClick={() => selectColor('blue')}></div>
        <div className={colorClass('yellow')} onClick={() => selectColor('yellow')}></div>
      </div>
    </>
  );
}

export default WhiteBoard;