import { useContext } from "react";
import ColorContext from "../ColorContext";

export default function () {
  const color = useContext(ColorContext);
  return (
    <div className="w-6 h-6 rounded" style={{ backgroundColor: color }}></div>
  );
}