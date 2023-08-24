import { useContext, useRef, useState } from 'react';
import Trash from './assets/Trash';
import Copy from './assets/Copy';
import MagnifyingGlassMinus from './assets/MagnifyingGlassMinus';
import MagnifyingGlassPlus from './assets/MagnifyingGlassPlus';
import HandRaised from './assets/HandRaised';
import WBContext from './WBContext';

export default function ({ selectedStrokes: {
  strokeIds, dragging, box: { left, top, width, height }
}, setSelectedStrokes }) {
  const WB = useContext(WBContext);
  const [moving, setMoving] = useState(false);
  const movingPos = useRef(null);
  const delta = useRef({ x: 0, y: 0 });
  const [hint, setHint] = useState(null);

  const onDelete = () => {
    setSelectedStrokes(null);
    WB.selectionBox = null;
    setTimeout(() => WB.delete(strokeIds, true), 10);
  };
  const onCopy = () => {
    WB.copy(strokeIds);
    setHint('Copied');
    setTimeout(() => setHint(null), 3000);
  };
  const onZoomOut = () => WB.multiZoomOut(strokeIds);
  const onZoomIn = () => WB.multiZoomIn(strokeIds);
  const onHandRaised = () => setMoving(!moving);

  const onMove = (e) => {
    let s = e;
    if (s.touches && s.touches.length >= 1) {
      s = s.touches[0];
    }
    if (s.pageX >= left && s.pageX <= left + width && s.pageY >= top && s.pageY <= top + height) {
      movingPos.current = { x: s.pageX, y: s.pageY };
    }
  };

  const onMoving = (e) => {
    if (movingPos.current) {
      let s = e;
      if (s.touches && s.touches.length >= 1) {
        s = s.touches[0];
      }
      const { x, y } = movingPos.current;
      const { x: deltaX, y: deltaY } = WB.multiMoving(strokeIds, { x: s.pageX - x, y: s.pageY - y });
      delta.current.x += deltaX;
      delta.current.y += deltaY;
      movingPos.current = { x: s.pageX, y: s.pageY };
    }
  };

  const onMoved = () => {
    if (movingPos.current) {
      WB.multiMoved(strokeIds, delta.current);
      movingPos.current = null;
      delta.current = { x: 0, y: 0 };
    }
  }
  return (
    <>
      {!dragging && (
        <>
          <div className={'fixed bg-slate-800 text-white rounded p-1 flex flex-row gap-3' + (movingPos.current ? ' z-[199]' : ' z-[201]')} style={{ left, top: top - 36 }}>
            <div className={'cursor-move' + (moving ? ' text-red-600 hover:text-red-300' : ' hover:text-slate-300')} onClick={onHandRaised}><HandRaised /></div>
            <div className="cursor-pointer hover:text-slate-300" onClick={onCopy}><Copy /></div>
            <div className="cursor-pointer hover:text-slate-300" onClick={onZoomOut}><MagnifyingGlassMinus /></div>
            <div className="cursor-pointer hover:text-slate-300" onClick={onZoomIn}><MagnifyingGlassPlus /></div>
            <div className="cursor-pointer hover:text-slate-300" onClick={onDelete}><Trash /></div>
          </div>
          <div className="fixed z-[99] h-full w-full" onClick={() => {
            setSelectedStrokes(null);
            WB.selectionBox = null;
          }}></div>
        </>
      )}
      <div id="strokes-selected" className={'fixed border-dashed border-2 border-slate-800 flex justify-center items-center' + (dragging ? ' z-[39]' : ' z-[100]') + (moving || hint ? ' bg-red-400 opacity-50' : '')} style={{ left, top, width, height }}>
        {hint && (
          <span className="text-2xl text-black">{hint}</span>
        )}
      </div>
      {moving && (
        <div className="fixed z-[200] h-full w-full bg-slate-200 opacity-25" onMouseDown={onMove} onMouseMove={onMoving} onMouseUp={onMoved} onMouseOut={onMoved} onTouchStart={onMove} onTouchMove={onMoving} onTouchEnd={onMoved} onTouchCancel={onMoved}></div>
      )}
    </>
  );
}