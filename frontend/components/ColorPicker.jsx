import { useContext, useState } from "react";
import Color from './assets/Color';
import Button from './Button';
import WBContext from "./WBContext";
import ColorContext from "./ColorContext";

function toRGB(color) {
  switch (color) {
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
          </>
        )}
      </div>
    </ColorContext.Provider>
  );
}