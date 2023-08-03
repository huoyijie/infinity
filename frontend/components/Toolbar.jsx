import Button from './Button';
import PencilSquare from './assets/PencilSquare';
import Trash from './assets/Trash';
import HandRaised from './assets/HandRaised';
import Question from './assets/Question';
import ColorPicker from './ColorPicker';
import PencilSetting from './PencilSetting';

export default function () {
  return (
    <>
      {/* 画笔颜色选择 */}
      <div className="fixed top-8 left-5 flex flex-col gap-y-2">
        <Button Icon={PencilSquare} />
        <Button Icon={Trash} />
        <Button Icon={HandRaised} />
        <ColorPicker />
        <PencilSetting />
        <Button Icon={Question} />
      </div>
    </>
  );
}