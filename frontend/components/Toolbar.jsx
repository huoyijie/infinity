import Button from './Button';
import Pencil from './assets/Pencil';
import Trash from './assets/Trash';
import HandRaised from './assets/HandRaised';
import Question from './assets/Question';
import ColorPicker from "./ColorPicker";

export default function () {
  return (
    <>
      {/* 画笔颜色选择 */}
      <div className="fixed top-8 left-5 flex flex-col gap-y-2">
        <Button Icon={Pencil} />
        <Button Icon={Trash} />
        <Button Icon={HandRaised} />
        <ColorPicker />
        <Button Icon={Question} />
      </div>
    </>
  );
}