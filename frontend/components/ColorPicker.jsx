import { useContext, useState } from 'react';
import Color from './assets/Color';
import Button from './Button';
import WBContext from './WBContext';
import ColorContext from './ColorContext';
import Cancel from './assets/Cancel';
import Sun from './assets/Sun'
import SettingContext from './SettingContext';
import OpacityContext from './OpacityContext';

const colors = [
  // black
  'rgb(0 0 0)',
  // red
  'rgb(220 38 38)',
  // orange
  'rgb(249 115 22)',
  // yellow
  'rgb(250 204 21)',
  // green
  'rgb(34 197 94)',
  // sky
  'rgb(56 189 248)',
  // blue
  'rgb(37 99 235)',
  // purple
  'rgb(168 85 247)',
  // fuchsia
  'rgb(232 121 249)',
  // pink
  'rgb(244 114 182)',
];

export default function ({ showColors, showOpacity }) {
  const WB = useContext(WBContext);
  const [selectedColor, setSelectedColor] = useState('black');
  const { opacity, setOpacity } = useContext(OpacityContext);
  const { setShowColors, setShowOpacity, resetAll } = useContext(SettingContext);

  // 点击颜色组件选色处理函数
  const selectColor = (color) => {
    setSelectedColor(color);
    setShowColors(false);
    WB.setColor(color);
  };

  return (
    <ColorContext.Provider value={selectedColor}>
      <div className="flex flex-row gap-1">
        <Button Icon={Color} selected={showColors} onClick={() => {
          resetAll();
          setShowColors(!showColors);
        }} />
        {showColors && (
          <div className="fixed left-16 grid grid-cols-5 gap-1 justify-items-center">
            {colors.map((color) => (
              <div className="inline-block w-10 h-10 rounded hover:opacity-25" style={{ backgroundColor: color }} onClick={() => selectColor(color)}></div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-row gap-1">
        <Button Icon={Sun} selected={showOpacity} onClick={() => {
          resetAll();
          setShowOpacity(!showOpacity);
        }} />
        {showOpacity && (
          <div className="rounded h-10 p-2" style={{ opacity: opacity + '%', backgroundColor: selectedColor }}>
            <input id="default-range" type="range" defaultValue={opacity} min={15} max={100} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" onChange={(e) => {
              const { value } = e.target;
              setOpacity(value);
              WB.setOpacity(value);
            }} />
          </div>
        )}
      </div>
    </ColorContext.Provider>
  );
}