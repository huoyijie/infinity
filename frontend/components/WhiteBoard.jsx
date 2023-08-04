import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const lbCanvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => {
    WB.init(canvasRef, lbCanvasRef, setCursor);
    return () => WB.close();
  }, []);

  const lbCanvasClass = () => {
    let c = 'fixed z-20 w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  return (
    <>
      <canvas ref={lbCanvasRef} id="lazyBrushCanvas" className={lbCanvasClass()}></canvas>
      {/* 画板 */}
      <canvas ref={canvasRef} id="canvas" className="z-10 w-full h-full"></canvas>
      <WBContext.Provider value={WB}>
        <Toolbar />
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;