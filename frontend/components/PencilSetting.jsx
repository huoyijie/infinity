import { useContext, useState } from 'react';
import Button from './Button';
import Pencil from './assets/Pencil';
import Cancel from './assets/Cancel';
import WBContext from './WBContext';
import SettingContext from './SettingContext';

export default function ({ showPencilSetting }) {
  const WB = useContext(WBContext);
  const { setShowPencilSetting, resetAll } = useContext(SettingContext);
  const [pencilSize, setPencilSize] = useState(10);

  return (
    <div className="flex flex-row gap-1">
      <Button Icon={Pencil} onClick={() => {
        resetAll();
        setShowPencilSetting(true);
      }} />
      {showPencilSetting && (
        <>
          <div className="rounded h-10 p-2">
            <input id="default-range" type="range" defaultValue={pencilSize} min={1} max={20} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" onChange={(e) => {
              const { value } = e.target;
              setPencilSize(value);
              WB.setSize(value);
            }} />
          </div>
          <div className="text-center p-2">{pencilSize}</div>
          <div className="bg-slate-700 hover:bg-slate-300 hover:cursor-pointer active:bg-slate-500 w-10 h-10 rounded p-2 text-white" onClick={() => setShowPencilSetting(false)}>
            <Cancel />
          </div>
        </>
      )}
    </div>
  );
}