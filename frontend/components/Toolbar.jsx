import Button from './Button';
import PencilSquare from './assets/PencilSquare';
import HandRaised from './assets/HandRaised';
import Question from './assets/Question';
import ColorPicker from './ColorPicker';
import PencilSetting from './PencilSetting';
import { useContext, useState } from 'react';
import SettingContext from './SettingContext';
import WBContext from './WBContext';
import Undo from './assets/Undo';
import Tape from './assets/Tape';

export default function ({ mode, setMode }) {
  const [showColors, setShowColors] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [showPencilSetting, setShowPencilSetting] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const resetAll = () => {
    setShowColors(false);
    setShowOpacity(false);
    setShowPencilSetting(false);
  };

  const onSetMode = (mode) => {
    setMode(mode);
    resetAll();
  };

  const WB = useContext(WBContext);
  WB.onClick = () => resetAll();
  WB.onCanUndo = (canUndo) => setCanUndo(canUndo);

  return (
    <>
      {/* 画笔颜色选择 */}
      <div className="fixed z-50 top-8 left-5 flex flex-col gap-y-2">
        <SettingContext.Provider value={{ setShowColors, setShowOpacity, setShowPencilSetting, resetAll }}>
          <Button Icon={PencilSquare} selected={mode === 'draw'} onClick={() => onSetMode('draw')} />
          <Button Icon={Tape} selected={mode === 'erase'} onClick={() => onSetMode('erase')} />
          <Button Icon={HandRaised} selected={mode === 'move'} onClick={() => onSetMode('move')} />
          <Button Icon={Undo} disabled={!((mode === 'draw' || mode === 'erase') && canUndo)} onClick={() => setTimeout(() => WB.undo(), 10)} />
          <ColorPicker showColors={showColors} showOpacity={showOpacity} />
          <PencilSetting showPencilSetting={showPencilSetting} />
          <Button Icon={Question} />
        </SettingContext.Provider>
      </div>
    </>
  );
}