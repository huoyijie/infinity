import { useContext } from "react";
import Trash from "./assets/Trash";
import WBContext from "./WBContext";

export default function ({ stroke: { strokeId, box: { left, top, width, height } }, setSelectedStroke }) {
  const WB = useContext(WBContext);
  const onDelete = () => {
    setTimeout(() => WB.delete(strokeId), 10);
    setSelectedStroke(null);
  };
  return (
    <>
      <div className="fixed z-[100] text-red-600" style={{ left, top: top - 36 }}><div className="cursor-pointer" onClick={onDelete}><Trash /></div></div>
      <div id={`stroke-${strokeId}-selected`} className="fixed z-[100] border-dashed border-2 border-slate-400	" style={{ left, top, width, height }}></div>
    </>
  );
}