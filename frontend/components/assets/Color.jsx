import { useContext } from "react";
import ColorContext from "../ColorContext";
import OpacityContext from "../OpacityContext";

export default function () {
  const color = useContext(ColorContext);
  const opacity = useContext(OpacityContext);
  return (
    <div className="w-6 h-6 rounded" style={{ backgroundColor: color, opacity: opacity + '%' }}></div>
  );
}