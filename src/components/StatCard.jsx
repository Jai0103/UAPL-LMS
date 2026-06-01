export default function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "from-blue-500 to-sky-400",
    green: "from-emerald-500 to-teal-400",
    amber: "from-amber-500 to-orange-400",
    slate: "from-slate-700 to-slate-500"
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{label}</p>
          <h3 className="mt-2 text-3xl font-black">{value}</h3>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]} text-white`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
