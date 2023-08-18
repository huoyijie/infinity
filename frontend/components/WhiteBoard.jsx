import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';
import OpacityContext from './OpacityContext';
import Spinner from './Spinner';
import SelectBox from './SelectBox';

function WhiteBoard() {
  const canvasRef = useRef(null);
  const draftCanvasRef = useRef(null);
  const lbCanvasRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [opacity, setOpacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStroke, setSelectedStroke] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => {
    const mode = localStorage.getItem('mode') || 'move';
    const opacity = Number(localStorage.getItem('opacity') || 100);
    setMode(mode);
    setOpacity(opacity);
    WB.init(
      canvasRef,
      draftCanvasRef,
      lbCanvasRef,
      mode,
      { opacity },
      () => setLoading(false),
      (cursor) => setCursor(cursor),
      (stroke) => setSelectedStroke(stroke));
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
      <canvas ref={canvasRef} id="canvas" className="fixed z-10 w-full h-full"></canvas>
      <WBContext.Provider value={WB}>
        <OpacityContext.Provider value={{
          opacity, setOpacity: (opacity) => {
            setOpacity(opacity);
            localStorage.setItem('opacity', opacity);
          }
        }}>
          <Toolbar mode={mode} setMode={(mode) => {
            WB.setMode(mode);
            setMode(mode);
            localStorage.setItem('mode', mode);
            setSelectedStroke(null);
          }} />
        </OpacityContext.Provider>
        {selectedStroke && (
          <SelectBox stroke={selectedStroke} setSelectedStroke={setSelectedStroke} />
        )}
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;