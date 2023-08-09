import Button from './Button';
import PencilSquare from './assets/PencilSquare';
import Trash from './assets/Trash';
import HandRaised from './assets/HandRaised';
import Question from './assets/Question';
import ColorPicker from './ColorPicker';
import PencilSetting from './PencilSetting';
import { useState } from 'react';
import SettingContext from './SettingContext';

export default function ({ mode, setMode }) {
  const [showColors, setShowColors] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [showPencilSetting, setShowPencilSetting] = useState(false);
  const resetAll = () => {
    setShowColors(false);
    setShowOpacity(false);
    setShowPencilSetting(false);
  };

  return (
    <>
      {/* 画笔颜色选择 */}
      <div className="fixed z-50 top-8 left-5 flex flex-col gap-y-2">
        <SettingContext.Provider value={{ setShowColors, setShowOpacity, setShowPencilSetting, resetAll }}>
          <Button Icon={PencilSquare} selected={mode === 'draw'} onClick={() => setMode('draw')} />
          <Button Icon={Trash} selected={mode === 'eraser'} onClick={() => setMode('eraser')} />
          <Button Icon={HandRaised} selected={mode === 'move'} onClick={() => setMode('move')} />
          <ColorPicker showColors={showColors} showOpacity={showOpacity} />
          <PencilSetting showPencilSetting={showPencilSetting} />
          <Button Icon={Question} />
        </SettingContext.Provider>
      </div>
    </>
  );
}