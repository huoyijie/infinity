import { useContext, useRef, useState } from 'react';
import Trash from './assets/Trash';
import WBContext from './WBContext';
import HandRaised from './assets/HandRaised';

export default function ({ stroke: { strokeId, box: { left, top, width, height } }, setSelectedStroke }) {
  const [moving, setMoving] = useState(false);
  const position = useRef(null);
  const delta = useRef({ x: 0, y: 0 });
  const WB = useContext(WBContext);

  if (width < 200) {
    left += width / 2 - 100;
    width = 200;
  }
  if (height < 200) {
    top += height / 2 - 100;
    height = 200;
  }

  const onDelete = () => {
    setTimeout(() => WB.delete(strokeId), 10);
    setSelectedStroke(null);
  };

  const onHandRaised = () => {
    setMoving(!moving);
  };

  const onMove = (e) => {
    let s = e;
    if (s.touches && s.touches.length >= 1) {
      s = s.touches[0];
    }
    if (s.pageX >= left && s.pageX <= left + width && s.pageY >= top && s.pageY <= top + height) {
      position.current = { x: s.pageX, y: s.pageY };
    }
  };

  const onMoving = (e) => {
    if (position.current) {
      let s = e;
      if (s.touches && s.touches.length >= 1) {
        s = s.touches[0];
      }
      const { x, y } = position.current;
      const { x: deltaX, y: deltaY } = WB.moving(strokeId, { x: s.pageX - x, y: s.pageY - y });
      delta.current.x += deltaX;
      delta.current.y += deltaY;
      position.current = { x: s.pageX, y: s.pageY };
    }
  };

  const onMoved = () => {
    if (position.current) {
      WB.moved(strokeId, delta.current);
      position.current = null;
      delta.current = { x: 0, y: 0 };
    }
  }

  return (
    <>
      <div className="fixed z-[201] bg-slate-800 text-white rounded p-1 flex flex-row gap-3" style={{ left, top: top - 36 }}>
        <div className="cursor-pointer hover:text-slate-300" onClick={onDelete}><Trash /></div>
        <div className={'cursor-move' + (moving ? ' text-red-600 hover:text-red-300' : ' hover:text-slate-300')} onClick={onHandRaised}><HandRaised /></div>
      </div>
      <div id={`stroke-${strokeId}-selected`} className={'fixed z-[100] border-dashed border-2 border-slate-800' + (moving ? ' bg-red-400 opacity-25' : '')} style={{ left, top, width, height }}></div>
      {moving && (
        <div className="fixed z-[200] h-full w-full bg-slate-200 opacity-25" onMouseDown={onMove} onMouseMove={onMoving} onMouseUp={onMoved} onMouseOut={onMoved} onTouchStart={onMove} onTouchMove={onMoving} onTouchEnd={onMoved} onTouchCancel={onMoved}></div>
      )}
    </>
  );
}