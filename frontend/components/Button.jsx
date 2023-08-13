export default function Button({ Icon, selected, onClick }) {
  return (
    <div className={`${selected ? 'bg-slate-400' : 'bg-white'} text-black hover:cursor-pointer active:bg-slate-600 w-10 h-10 rounded border flex justify-center items-center`} onClick={onClick}><Icon /></div>
  );
}