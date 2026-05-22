interface StatsCardProps {
  id: string;
  title: string;
  titleAr: string;
  value: string | number;
  label: string;
  icon: any; // Lucide icon component
  colorClass: string;
}

export default function StatsCard({ id, title, titleAr, value, label, icon: Icon, colorClass }: StatsCardProps) {
  return (
    <div 
      id={id}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-bl-full -mr-2 -mt-2 transition-all group-hover:bg-slate-100 dark:group-hover:bg-slate-700 duration-200 -z-10" />
      
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 block tracking-wider uppercase">
            {title}
          </span>
          <span className="text-[10px] font-sans font-medium text-slate-400 dark:text-slate-400 block tracking-tight text-right dir-rtl">
            {titleAr}
          </span>
        </div>
        <div className={`p-1.5 rounded-lg ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-black font-sans tracking-tight text-slate-800 dark:text-slate-100 leading-none">
          {value}
        </h3>
        <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
          {label}
        </p>
      </div>
    </div>
  );
}
