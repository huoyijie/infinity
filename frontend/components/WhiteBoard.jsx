import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => WB.init(canvasRef, setCursor), []);

  const canvasClass = () => {
    let c = 'w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  return (
    <>
      {/* 画板 */}
      <canvas ref={canvasRef} id="canvas" className={canvasClass()}></canvas>
      <WBContext.Provider value={WB}>
        <Toolbar />
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;