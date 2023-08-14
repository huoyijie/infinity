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

export default function ({ showHelp }) {
  const { setShowHelp, resetAll } = useContext(SettingContext);

  return (
    <div className="flex flex-row">
      <Button Icon={Question} selected={showHelp} onClick={() => {
        resetAll();
        setShowHelp(!showHelp);
      }} />
      {showHelp && (
        <div className="fixed left-16 border rounded grid grid-cols-2 gap-1 bg-white text-slate-400 p-2">
          <span><PencilSquare />Draw mode</span>
          <span><Tape />Erase mode</span>
          <span><HandRaised />Move mode</span>
          <span><Undo />Undo stroke</span>
          <span>
            <ColorContext.Provider value={'black'}>
              <OpacityContext.Provider value={100}>
                <Color />
              </OpacityContext.Provider>
            </ColorContext.Provider>Set color
          </span>
          <span><Sun />Set opacity</span>
          <span><Pencil />Set pencil size</span>
          <span><Question />Help</span>
          <span className="flex justify-center items-center"><MouseWheel /></span>
          <span><p>Mouse wheel</p><p>(zoom in/out)</p></span>
          <span className="flex justify-center items-center"><TouchPinch /></span>
          <span><p>Touch pinch</p><p>(zoom in/out)</p></span>
        </div>
      )}
    </div>
  );
}