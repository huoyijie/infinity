import { useContext } from 'react';
import Button from './Button';
import Pencil from './assets/Pencil';
import SettingContext from './SettingContext';
import PencilContext from './PencilContext';

export default function ({ showPencilSetting }) {
  const { setShowPencilSetting, resetAll } = useContext(SettingContext);
  const { pencilSize, setPencilSize } = useContext(PencilContext);

  return (
    <div className="flex flex-row">
      <Button Icon={Pencil} selected={showPencilSetting} onClick={() => {
        resetAll();
        setShowPencilSetting(!showPencilSetting);
      }} />
      {showPencilSetting && (
        <div className="fixed left-16 h-10 border rounded flex flex-row bg-white">
          <div className="rounded h-10 p-2">
            <input id="default-range" type="range" defaultValue={pencilSize} min={1} max={100} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" onChange={(e) => setPencilSize(e.target.value)} />
          </div>
          <div className="text-center p-2">{pencilSize}</div>
        </div>
      )}
    </div>
  );
}