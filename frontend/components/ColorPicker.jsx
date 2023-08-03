import { useContext, useState } from 'react';
import Color from './assets/Color';
import Button from './Button';
import WBContext from './WBContext';
import ColorContext from './ColorContext';
import OpacityContext from './OpacityContext';
import Cancel from './assets/Cancel';
import Sun from './assets/Sun'

function toRGB(color) {
  switch (color) {
    case 'black':
      return '#000000';
    case 'red':
      return '#ff0000';
    case 'blue':
      return '#0000ff';
    case 'yellow':
      return '#ffff00';
  }
}

export default function () {
  const WB = useContext(WBContext);
  const [selectedColor, setSelectedColor] = useState('black');
  const [showColors, setShowColors] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [showOpacity, setShowOpacity] = useState(false);

  const colorClass = (color) => {
    let c = 'inline-block w-10 h-10 rounded';
    if (color === 'black') {
      c += ' bg-black hover:bg-slate-500';
    } else {
      c += ` bg-[${toRGB(color)}] hover:bg-${color}-300`;
    }
    return c;
  };

  // 点击颜色组件选色处理函数
  const selectColor = (color) => {
    setSelectedColor(color);
    WB.setColor(color);
    setShowColors(false);
  };

  return (
    <ColorContext.Provider value={selectedColor}>
      <OpacityContext.Provider value={opacity}>
        <div className="flex flex-row gap-1">
          <Button Icon={Color} onClick={() => {
            setShowColors(true);
          }} />
          {showColors && (
            <>
              <div className={colorClass('black')} onClick={() => selectColor('black')}></div>
              <div className={colorClass('red')} onClick={() => selectColor('red')}></div>
              <div className={colorClass('blue')} onClick={() => selectColor('blue')}></div>
              <div className={colorClass('yellow')} onClick={() => selectColor('yellow')}></div>
              <div className="bg-slate-700 hover:bg-slate-300 hover:cursor-pointer active:bg-slate-500 w-10 h-10 rounded p-2 text-white" onClick={() => setShowColors(false)}>
                <Cancel />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-row gap-1">
          <Button Icon={Sun} onClick={() => setShowOpacity(true)} />
          {showOpacity && (
            <>
              <div className={`rounded h-10 p-2 bg-[${toRGB(selectedColor)}]`} style={{ opacity: opacity + '%' }}>
                <input id="default-range" type="range" defaultValue={100} min={15} max={100} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" onChange={(e) => {
                  const { value } = e.target;
                  setOpacity(value);
                  WB.setOpacity(value);
                }} />
              </div>
              <div className="bg-slate-700 hover:bg-slate-300 hover:cursor-pointer active:bg-slate-500 w-10 h-10 rounded p-2 text-white" onClick={() => setShowOpacity(false)}>
                <Cancel />
              </div>
            </>
          )}
        </div>
      </OpacityContext.Provider>
    </ColorContext.Provider>
  );
}