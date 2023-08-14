import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';
import OpacityContext from './OpacityContext';
import Spinner from './Spinner';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const recvCanvasRef = useRef(null);
  const draftCanvasRef = useRef(null);
  const lbCanvasRef = useRef(null);
  const [mode, setMode] = useState('move');
  const [cursor, setCursor] = useState(null);
  const [opacity, setOpacity] = useState(100);
  const [loading, setLoading] = useState(true);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => {
    WB.init(canvasRef, recvCanvasRef, draftCanvasRef, lbCanvasRef, mode, () => setLoading(false), (cursor) => setCursor(cursor));
    return () => WB.close();
  }, []);

  const lbCanvasClass = () => {
    let c = 'fixed z-40 w-full h-full';
    if (cursor) {
      c += ` cursor-${cursor}`;
    }
    return c;
  };

  return (
    <>
      {loading && <Spinner />}
      <canvas ref={lbCanvasRef} id="lazyBrushCanvas" className={lbCanvasClass()}></canvas>
      {/* 画板 */}
      <canvas ref={draftCanvasRef} id="draftCanvas" className="fixed z-30 w-full h-full" style={{ opacity: opacity + '%' }}></canvas>
      <canvas ref={recvCanvasRef} id="recvCanvas" className="fixed z-20 w-full h-full"></canvas>
      <canvas ref={canvasRef} id="canvas" className="fixed z-10 w-full h-full"></canvas>
      <WBContext.Provider value={WB}>
        <OpacityContext.Provider value={{ opacity, setOpacity }}>
          <Toolbar mode={mode} setMode={(mode) => {
            WB.setMode(mode);
            setMode(mode);
          }} />
        </OpacityContext.Provider>
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;