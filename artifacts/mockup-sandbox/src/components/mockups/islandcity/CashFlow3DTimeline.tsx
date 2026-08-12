import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, Calendar, ShieldCheck } from "lucide-react";
import "./cash-flow-3d.css";

const timelineData = [
  {
    id: "t1",
    date: "TODAY",
    title: "Today's Shift",
    type: "income",
    amount: 285,
    goal: 400,
    details: "71% to daily target",
    balanceAfter: 2450,
  },
  {
    id: "t2",
    date: "IN 2 DAYS",
    title: "Car Payment",
    type: "expense",
    amount: 919,
    details: "Auto-deduction",
    balanceAfter: 1531,
  },
  {
    id: "t3",
    date: "IN 7 DAYS",
    title: "Weekly Clearance",
    type: "income",
    amount: 1885,
    details: "Est. current momentum",
    balanceAfter: 3416,
  },
  {
    id: "t4",
    date: "IN 8 DAYS",
    title: "Apartment Rent",
    type: "expense",
    amount: 1500,
    details: "Bank transfer",
    balanceAfter: 1916,
  },
  {
    id: "t5",
    date: "IN 12 DAYS",
    title: "Insurance",
    type: "expense",
    amount: 250,
    details: "Geico Auto",
    balanceAfter: 1666,
  },
];

export function CashFlow3DTimeline() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="cf-container">
      <div className="cf-bg-grid" />
      <div className="cf-bg-glow" />

      <div className="cf-content">
        <div className="flex justify-between items-end mb-16 relative z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter">RUNWAY</h1>
            <p className="text-[10px] text-white/50 tracking-[0.2em] uppercase mt-1">Cash Flow Projection</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
            <Activity size={18} className="text-white/80" />
          </div>
        </div>

        <div className="mb-16 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck size={14} className="text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-400/90 font-semibold uppercase tracking-widest">
              Safe to Spend
            </p>
          </div>
          
          <h2 className="text-7xl font-bold tracking-tighter mb-8 font-mono-custom">
            $1,531<span className="text-3xl text-white/30">.00</span>
          </h2>
          
          <div className="flex gap-4">
            <div className="flex-1 bg-white/[0.02] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1.5 font-semibold">Current Balance</p>
              <p className="text-xl font-bold font-mono-custom text-white/90">$2,450</p>
            </div>
            <div className="flex-1 bg-red-500/[0.03] p-4 rounded-2xl border border-red-500/10 backdrop-blur-md">
              <p className="text-[10px] text-red-400/60 uppercase tracking-widest mb-1.5 font-semibold">Locked</p>
              <p className="text-xl font-bold font-mono-custom text-red-400">-$919</p>
            </div>
          </div>
        </div>

        <div className="cf-perspective-stage">
          {timelineData.map((item, i) => {
            const isActive = activeIndex === i;
            const isHoveredAny = activeIndex !== null;
            const isBefore = isHoveredAny && i < activeIndex;
            const isAfter = isHoveredAny && i > activeIndex;
            
            // Base state (angled backwards, overlapping)
            let transform = `rotateX(20deg) translateY(${i * -15}px) translateZ(${i * -40}px) scale(${1 - i * 0.04})`;
            let margin = '-60px'; 
            let opacity = 1 - (i * 0.15);
            let zIndex = timelineData.length - i;
            
            if (isActive) {
               transform = 'rotateX(0deg) translateY(-20px) translateZ(80px) scale(1.05)';
               margin = '30px';
               opacity = 1;
               zIndex = 50;
            } else if (isBefore) {
               transform = `rotateX(35deg) translateY(${-40 + i * -10}px) translateZ(${-80 + i * -20}px) scale(${0.9 - i * 0.02})`;
               opacity = 0.3;
               margin = '-80px';
            } else if (isAfter) {
               const offset = i - activeIndex;
               transform = `rotateX(15deg) translateY(${30 + offset * -15}px) translateZ(${-20 + offset * -30}px) scale(${0.95 - offset * 0.04})`;
               opacity = 0.5 - (offset * 0.1);
               margin = '-50px';
            }

            return (
              <div 
                 key={item.id}
                 className="cf-card-wrapper"
                 style={{
                   transform,
                   marginBottom: i === timelineData.length - 1 ? '0' : margin,
                   opacity,
                   zIndex,
                   filter: isActive ? 'brightness(1.1)' : (isHoveredAny ? 'brightness(0.6)' : 'brightness(1)')
                 }}
                 onMouseEnter={() => setActiveIndex(i)}
                 onMouseLeave={() => setActiveIndex(null)}
              >
                <div className={`cf-card ${isActive ? 'ring-1 ring-white/30' : ''}`}>
                  {item.type === 'income' ? <div className="cf-card-glow-income" /> : <div className="cf-card-glow-expense" />}
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={12} className="text-white/40" />
                        <span className="text-[10px] font-bold text-white/50 tracking-[0.15em] uppercase">{item.date}</span>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight">{item.title}</h3>
                      <p className="text-sm text-white/50 mt-1.5">{item.details}</p>
                    </div>
                    
                    <div className={`flex items-center gap-1 ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      <span className="text-2xl font-bold font-mono-custom">
                        {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-5 flex justify-between items-center relative z-10">
                    <span className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">Projected Balance</span>
                    <span className="text-base font-bold font-mono-custom text-white/80">${item.balanceAfter.toLocaleString()}</span>
                  </div>
                  
                  {item.goal && (
                    <div className="mt-5 pt-5 border-t border-white/5 relative z-10 transition-all duration-500" style={{ opacity: isActive ? 1 : 0.4, height: isActive ? 'auto' : '20px' }}>
                      <div className="flex justify-between text-xs mb-2.5">
                        <span className="text-white/50 font-medium">Daily Goal</span>
                        <span className="font-mono-custom text-white/70">${item.amount} / ${item.goal}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${Math.min((item.amount / item.goal) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
