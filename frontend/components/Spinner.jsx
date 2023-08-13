import Spinner from "./assets/Spinner";

export default function () {
  return (
    <div className="h-full w-full fixed text-center p-72">
      <div role="status">
        <Spinner />
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}