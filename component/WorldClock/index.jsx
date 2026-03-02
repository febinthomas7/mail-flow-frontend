import React, { useState, useEffect } from "react";

const WorldClocks = () => {
  const [clocks, setClocks] = useState([
    {
      label: "USA",
      city: "New York",
      zone: "America/New_York",
      icon: "fa-flag-usa",
    },
    {
      label: "Canada",
      city: "Toronto",
      zone: "America/Toronto",
      icon: "fa-leaf",
    },
    {
      label: "Australia",
      city: "Sydney",
      zone: "Australia/Sydney",
      icon: "fa-kiwi-bird",
    },
  ]);

  const [timeData, setTimeData] = useState({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const newTimeData = {};

      clocks.forEach((clock) => {
        // Get the hour in 24h format to calculate "Business Status"
        const hour = parseInt(
          new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            hour12: false,
            timeZone: clock.zone,
          }).format(now),
        );

        // Get the display time
        const timeStr = new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: clock.zone,
        }).format(now);

        // Status: 9 AM to 5 PM is Business Hours
        const isBusiness = hour >= 9 && hour < 17;

        newTimeData[clock.label] = { time: timeStr, isBusiness };
      });

      setTimeData(newTimeData);
    };

    const timer = setInterval(updateTime, 1000);
    updateTime();
    return () => clearInterval(timer);
  }, [clocks]);

  return (
    <div className="glass p-6 w-full rounded-[2.5rem]  border-white/5 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">
          Global Market Status
        </h3>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-[8px] text-slate-400 uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>{" "}
            Active
          </span>
          <span className="flex items-center gap-1 text-[8px] text-slate-400 uppercase font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sleep
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {clocks.map((clock) => {
          const data = timeData[clock.label] || {
            time: "--:--:--",
            isBusiness: false,
          };
          return (
            <div
              key={clock.label}
              className="bg-black/40 rounded-2xl p-4 border border-slate-800/30 flex items-center justify-between group transition-all hover:border-indigo-500/40"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    data.isBusiness
                      ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  <i className={`fas ${clock.icon} text-sm`}></i>
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">
                    {clock.label}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase">
                    {clock.city}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`text-sm font-mono font-bold tracking-tighter ${data.isBusiness ? "text-emerald-400" : "text-slate-400"}`}
                >
                  {data.time}
                </p>
                <p className="text-[7px] font-black uppercase tracking-widest mt-0.5">
                  {data.isBusiness ? "Open for Business" : "Market Closed"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorldClocks;
