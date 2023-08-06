import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';
import OpacityContext from './OpacityContext';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const draftCanvasRef = useRef(null);
  const lbCanvasRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [opacity, setOpacity] = useState(100);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => {
    WB.init(canvasRef, draftCanvasRef, lbCanvasRef, setCursor);
    return () => WB.close();
  }, []);

  const lbCanvasClass = () => {
    let c = 'fixed z-30 w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  return (
    <>
      <canvas ref={lbCanvasRef} id="lazyBrushCanvas" className={lbCanvasClass()}></canvas>
      {/* 画板 */}
      <canvas ref={draftCanvasRef} id="draftCanvas" className="fixed z-20 w-full h-full" style={{ opacity: opacity + '%' }}></canvas>
      <canvas ref={canvasRef} id="canvas" className="fixed z-10 w-full h-full"></canvas>
      <WBContext.Provider value={WB}>
        <OpacityContext.Provider value={{ opacity, setOpacity }}>
          <Toolbar />
        </OpacityContext.Provider>
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;