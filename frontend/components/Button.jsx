export default function Button({ Icon, selected, onClick, disabled }) {
  const className = () => {
    return `${selected ? 'bg-slate-400' : 'bg-white'} ${disabled ? 'text-slate-400' : 'active:bg-slate-600 hover:cursor-pointer'} w-10 h-10 rounded border flex justify-center items-center`;
  };

  return (
    <button className={className()} onClick={onClick} disabled={disabled}><Icon /></button>
  );
}