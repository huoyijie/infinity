export default function Button({ Icon, onClick }) {
  return (
    <div className="bg-sky-500 hover:bg-sky-600 hover:cursor-pointer active:bg-sky-700 w-10 h-10 rounded p-2 text-white" onClick={onClick}><Icon /></div>
  );
}