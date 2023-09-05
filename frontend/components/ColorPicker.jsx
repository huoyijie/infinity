import { useContext } from 'react';
import Color from './assets/Color';
import Sun from './assets/Sun'
import Button from './Button';
import ColorContext from './ColorContext';
import SettingContext from './SettingContext';
import OpacityContext from './OpacityContext';
import { HexColorPicker } from 'react-colorful';

const colors = [
  // black
  '#000',
  // red
  '#DC2626',
  // orange
  '#F97316',
  // yellow
  '#FACC15',
  // green
  '#22C55E',
  // sky
  '#38BDF8',
  // blue
  '#2563EB',
  // purple
  '#A855F7',
  // fuchsia
  '#E879F9',
  // pink
  '#F472B6',
];

export default function ({ showColors, showOpacity }) {
  const { selectedColor, setSelectedColor } = useContext(ColorContext);
  const { opacity, setOpacity } = useContext(OpacityContext);
  const { setShowColors, setShowOpacity, resetAll } = useContext(SettingContext);

  // 点击颜色组件选色处理函数
  const selectColor = (color) => {
    setSelectedColor(color);
    setShowColors(false);
  };

  return (
    <>
      <div className="flex flex-row">
        <Button Icon={Color} selected={showColors} onClick={() => {
          resetAll();
          setShowColors(!showColors);
        }} />
        {showColors && (
          <>
            <div className="fixed left-16 grid grid-cols-5 gap-1 justify-items-center">
              {colors.map((color) => (
                <div key={color} className="inline-block w-10 h-10 rounded hover:opacity-25" style={{ backgroundColor: color }} onClick={() => selectColor(color)}></div>
              ))}
            </div>
            <div className="fixed left-16 top-96 translate-y-6">
              <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-row">
        <Button Icon={Sun} selected={showOpacity} onClick={() => {
          resetAll();
          setShowOpacity(!showOpacity);
        }} />
        {showOpacity && (
          <div className="fixed left-16 rounded h-10 p-2" style={{ opacity: opacity + '%', backgroundColor: selectedColor }}>
            <input id="default-range" type="range" defaultValue={opacity} min={15} max={100} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" onChange={(e) => setOpacity(e.target.value)} />
          </div>
        )}
      </div>
    </>
  );
}