import { useRef, useState, useEffect } from 'react';
import WB from './WB';
import Toolbar from './Toolbar';
import WBContext from './WBContext';
import ColorContext from './ColorContext';
import OpacityContext from './OpacityContext';
import PencilContext from './PencilContext';
import Spinner from './Spinner';
import SelectBox from './SelectBox';
import MultiSelectBox from './MultiSelectBox';

function WhiteBoard() {
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const draftCanvasRef = useRef(null);
  const lbCanvasRef = useRef(null);
  const [mode, setMode] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [opacity, setOpacity] = useState(null);
  const [pencilSize, setPencilSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedStroke, setSelectedStroke] = useState(null);
  const [selectedStrokes, setSelectedStrokes] = useState(null);

  // 启动 socket 连接，初始化共享画板组件
  useEffect(() => {
    const mode = localStorage.getItem('mode') || 'move';
    const selectedColor = localStorage.getItem('selectedColor') || 'black';
    const opacity = Number(localStorage.getItem('opacity') || 100);
    const pencilSize = Number(localStorage.getItem('pencilSize') || 15);
    setMode(mode);
    setSelectedColor(selectedColor);
    setOpacity(opacity);
    setPencilSize(pencilSize);
    WB.init(
      canvasRef,
      draftCanvasRef,
      lbCanvasRef,
      mode,
      { color: selectedColor, opacity, size: pencilSize },
      () => setLoading(false),
      (cursor) => setCursor(cursor),
      (stroke) => setSelectedStroke(stroke),
      (strokes) => setSelectedStrokes(strokes));
    return () => WB.close();
  }, []);

  const colorCtxVal = {
    selectedColor, setSelectedColor: (color) => {
      WB.setColor(color);
      setSelectedColor(color);
      localStorage.setItem('selectedColor', color);
    }
  };

  const opacityCtxVal = {
    opacity, setOpacity: (opacity) => {
      WB.setOpacity(opacity);
      setOpacity(opacity);
      localStorage.setItem('opacity', opacity);
    }
  };

  const pencilCtxVal = {
    pencilSize, setPencilSize: (pencilSize) => {
      WB.setSize(pencilSize);
      setPencilSize(pencilSize);
      localStorage.setItem('pencilSize', pencilSize)
    }
  };

  const clearSelects = () => {
    setSelectedStroke(null);
    setSelectedStrokes(null);
    WB.selectionBox = null;
  };

  const changeMode = (mode) => {
    WB.setMode(mode);
    setMode(mode);
    localStorage.setItem('mode', mode);
    clearSelects();
  };

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
        <ColorContext.Provider value={colorCtxVal}>
          <OpacityContext.Provider value={opacityCtxVal}>
            <PencilContext.Provider value={pencilCtxVal}>
              <Toolbar mode={mode} setMode={changeMode} />
            </PencilContext.Provider>
          </OpacityContext.Provider>
        </ColorContext.Provider>
        {!selectedStrokes && selectedStroke && (
          <SelectBox selectedStroke={selectedStroke} setSelectedStroke={setSelectedStroke} />
        )}
        {selectedStrokes && (
          <MultiSelectBox selectedStrokes={selectedStrokes} setSelectedStrokes={setSelectedStrokes} />
        )}
      </WBContext.Provider>
    </>
  );
}

export default WhiteBoard;