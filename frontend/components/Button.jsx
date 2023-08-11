export default function Button({ Icon, selected, onClick }) {
  return (
    <div className={`${selected ? 'bg-sky-950' : 'bg-sky-500'} hover:cursor-pointer w-10 h-10 rounded p-2 text-white`} onClick={onClick}><Icon /></div>
  );
}