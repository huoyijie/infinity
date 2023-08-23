import Spinner from "./assets/Spinner";

export default function () {
  return (
    <div className="h-full w-full fixed flex justify-center items-center text-center bg-slate-300 opacity-75 z-[1000]">
      <div role="status">
        <Spinner />
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}