import { useContext } from "react";
import ColorContext from "../ColorContext";
import OpacityContext from "../OpacityContext";

export default function () {
  const color = useContext(ColorContext);
  const opacity = useContext(OpacityContext);
  return (
    <div className="w-5 h-5 rounded" style={{ backgroundColor: color, opacity: opacity + '%' }}></div>
  );
}