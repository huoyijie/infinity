import { useContext } from 'react';
import Question from './assets/Question';
import Button from './Button';
import SettingContext from './SettingContext';
import PencilSquare from './assets/PencilSquare';
import Tape from './assets/Tape';
import HandRaised from './assets/HandRaised';
import Undo from './assets/Undo';
import Color from './assets/Color';
import Sun from './assets/Sun';
import ColorContext from './ColorContext';
import OpacityContext from './OpacityContext';
import Pencil from './assets/Pencil';
import MouseWheel from './assets/MouseWheel';
import TouchPinch from './assets/TouchPinch';
import BarsUp from './assets/BarsUp';
import BarsDown from './assets/BarsDown';
import ArrowRipple from './assets/ArrowRipple';

export default function ({ showHelp }) {
  const { setShowHelp, resetAll } = useContext(SettingContext);

  return (
    <div className="flex flex-row">
      <Button Icon={Question} selected={showHelp} onClick={() => {
        resetAll();
        setShowHelp(!showHelp);
      }} />
      {showHelp && (
        <div className="fixed left-16 -translate-y-40 border rounded grid grid-cols-2 gap-1 bg-white text-slate-400 p-2">
          <span><BarsUp />Collapse</span>
          <span><BarsDown />Expand</span>
          <span><PencilSquare />Draw</span>
          <span><Tape />Erase</span>
          <span><HandRaised />Move</span>
          <span><ArrowRipple />Select</span>
          <span><Undo />Undo</span>
          <span>
            <ColorContext.Provider value={{ selectedColor: 'black' }}>
              <OpacityContext.Provider value={100}>
                <Color />
              </OpacityContext.Provider>
            </ColorContext.Provider>Set color
          </span>
          <span><Sun />Set opacity</span>
          <span><Pencil />Set pencil size</span>
          <span className="flex justify-center items-center"><MouseWheel /></span>
          <span><p>Zoom in/out</p><p>(mouse wheel)</p></span>
          <span className="flex justify-center items-center"><TouchPinch /></span>
          <span><p>Zoom in/out</p><p>(touch pinch)</p></span>
        </div>
      )}
    </div>
  );
}