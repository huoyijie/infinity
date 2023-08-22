import Button from './Button';
import PencilSquare from './assets/PencilSquare';
import HandRaised from './assets/HandRaised';
import ColorPicker from './ColorPicker';
import PencilSetting from './PencilSetting';
import { useContext, useState } from 'react';
import SettingContext from './SettingContext';
import WBContext from './WBContext';
import Undo from './assets/Undo';
import Tape from './assets/Tape';
import Help from './Help';
import BarsUp from './assets/BarsUp';
import BarsDown from './assets/BarsDown';
import ArrowRipple from './assets/ArrowRipple';

export default function ({ mode, setMode }) {
  const [showColors, setShowColors] = useState(false);
  const [showOpacity, setShowOpacity] = useState(false);
  const [showPencilSetting, setShowPencilSetting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);

  const resetAll = () => {
    setShowColors(false);
    setShowOpacity(false);
    setShowPencilSetting(false);
    setShowHelp(false);
  };

  const onSetMode = (mode) => {
    setMode(mode);
    resetAll();
  };

  const WB = useContext(WBContext);
  WB.onClick = () => resetAll();
  WB.onCanUndo = (canUndo) => setCanUndo(canUndo);

  return (
    <div className="fixed z-[300] top-8 left-5 flex flex-col gap-y-2 text-slate-900">
      <Button Icon={showToolbar ? BarsUp : BarsDown} onClick={() => setShowToolbar(!showToolbar)} />
      <div className={'flex flex-col gap-y-2' + (!showToolbar ? ' hidden': '')}>
        <SettingContext.Provider value={{ setShowColors, setShowOpacity, setShowPencilSetting, setShowHelp, resetAll }}>
          <Button Icon={PencilSquare} selected={mode === 'draw'} onClick={() => onSetMode('draw')} />
          <Button Icon={Tape} selected={mode === 'erase'} onClick={() => onSetMode('erase')} />
          <Button Icon={HandRaised} selected={mode === 'move'} onClick={() => onSetMode('move')} />
          <Button Icon={ArrowRipple} selected={mode === 'select'} onClick={() => onSetMode('select')} />
          <Button Icon={Undo} disabled={!((mode === 'draw' || mode === 'erase') && canUndo)} onClick={() => setTimeout(() => WB.undo(), 10)} />
          <ColorPicker showColors={showColors} showOpacity={showOpacity} />
          <PencilSetting showPencilSetting={showPencilSetting} />
          <Help showHelp={showHelp} />
        </SettingContext.Provider>
      </div>
    </div>
  );
}