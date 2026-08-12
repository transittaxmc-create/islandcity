import React from 'react';
import { ArrowRight, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import './CashFlowJournal.css';

const TIMELINE = [
  { day: "Monday", date: "Aug 12", type: "past", goal: 300, actual: 310, events: [] },
  { day: "Today", date: "Aug 13", type: "today", goal: 400, actual: 285, events: [] },
  { day: "Tomorrow", date: "Aug 14", type: "future", goal: 320, actual: 0, events: [] },
  { day: "Thursday", date: "Aug 15", type: "future", goal: 350, actual: 0, events: [{ name: "Car Payment", amount: -919 }] },
  { day: "Friday", date: "Aug 16", type: "future", goal: 400, actual: 0, events: [] },
  { day: "Saturday", date: "Aug 17", type: "future", goal: 480, actual: 0, events: [] },
  { day: "Sunday", date: "Aug 18", type: "future", goal: 0, actual: 0, events: [] },
  { day: "Next Wed", date: "Aug 21", type: "future", goal: 320, actual: 0, events: [{ name: "Renta", amount: -1500 }] },
];

export function CashFlowJournal() {
  const bankBalance = 2450;
  const upcomingBills = 2419;
  const safeToSpend = bankBalance - upcomingBills;

  return (
    <div className="w-full min-h-screen bg-[#F4F4F0] text-[#1c1c1a] font-sans flex justify-center selection:bg-[#E5E5E0]">
      <div className="w-full max-w-[390px] bg-[#FCFCFA] min-h-screen shadow-xl overflow-y-auto relative cfj-scroll flex flex-col">
        
        {/* Header / Hero */}
        <header className="px-6 pt-12 pb-8 border-b border-[#EAEAE5] bg-white relative z-10">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="cfj-serif text-[26px] leading-none font-medium tracking-tight">IslandCity</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#888] mt-2">Driver Journal</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F4F4F0] border border-[#EAEAE5] flex items-center justify-center text-xs font-medium text-[#555]">
              M
            </div>
          </div>

          <div>
            <p className="text-sm text-[#666] mb-1 font-medium">Safe to spend</p>
            <div className="flex items-baseline gap-1">
              <h2 className="cfj-mono text-[56px] leading-[1] font-medium tracking-tighter">${safeToSpend}</h2>
            </div>
            
            <div className="mt-6 flex items-stretch gap-3 text-xs text-[#555] bg-[#F9F9F8] border border-[#EAEAE5] p-3 rounded-xl">
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-[#888] mb-1">
                  <Wallet size={12} /> Bank Balance
                </span>
                <span className="cfj-mono text-[15px] text-[#1c1c1a]">${bankBalance.toLocaleString()}</span>
              </div>
              <div className="w-[1px] bg-[#EAEAE5] my-1"></div>
              <div className="flex-1">
                <span className="flex items-center gap-1.5 text-[#888] mb-1">
                  <AlertTriangle size={12} /> Upcoming Bills
                </span>
                <span className="cfj-mono text-[15px] text-[#B03B3B]">-${upcomingBills.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Timeline */}
        <section className="px-6 py-8 flex-1">
          <h3 className="text-[11px] uppercase tracking-[0.15em] text-[#888] mb-8 font-semibold">Cash Flow Timeline</h3>
          
          <div className="relative border-l border-[#EAEAE5] ml-[7px] space-y-8 pb-4">
            {TIMELINE.map((item, i) => (
              <div className="relative pl-6" key={i}>
                {/* Dot */}
                {item.type === "past" && (
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#EAEAE5] border-2 border-white"></div>
                )}
                {item.type === "today" && (
                  <div className="absolute -left-[6px] top-1 w-3 h-3 rounded-full bg-[#2E6B4B] border-2 border-[#FCFCFA] cfj-pulse-dot z-10"></div>
                )}
                {item.type === "future" && (
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#DCDCD8]"></div>
                )}
                
                {/* Header */}
                <div className="flex items-baseline gap-2 mb-2">
                  <h4 className={`font-medium text-[15px] ${item.type === 'today' ? 'text-[#2E6B4B]' : 'text-[#1c1c1a]'}`}>
                    {item.day}
                  </h4>
                  <span className="text-[13px] text-[#888]">{item.date}</span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {/* Past earning */}
                  {item.type === "past" && item.actual > 0 && (
                    <div className="text-[13px] text-[#666]">
                      Earned <span className="cfj-mono text-[#1c1c1a] font-medium">${item.actual}</span>
                    </div>
                  )}

                  {/* Today progress */}
                  {item.type === "today" && (
                    <div className="bg-white rounded-xl p-3.5 border border-[#2E6B4B]/20 shadow-sm">
                      <div className="flex justify-between text-[13px] mb-2.5 items-end">
                        <span className="text-[#555] font-medium">Today's Progress</span>
                        <span className="cfj-mono text-sm">
                          <span className="text-[#2E6B4B] font-medium">${item.actual}</span> 
                          <span className="text-[#888]"> / ${item.goal}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F4F4F0] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#2E6B4B] rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, (item.actual/item.goal)*100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Future goal */}
                  {item.type === "future" && item.goal > 0 && (
                    <div className="flex items-center gap-1.5 text-[13px] text-[#888]">
                      <TrendingUp size={14} className="text-[#CCC]" />
                      <span>Goal: <span className="cfj-mono text-[#555]">${item.goal}</span></span>
                    </div>
                  )}

                  {/* Events / Bills */}
                  {item.events.map((event, j) => (
                    <div key={j} className="flex justify-between items-center bg-[#FFF5F5] border border-[#FEE2E2] p-3 rounded-xl mt-2">
                      <div className="flex items-center gap-2 text-[#B03B3B]">
                        <div className="w-6 h-6 rounded-md bg-[#B03B3B]/10 flex items-center justify-center">
                          <ArrowRight size={12} className="rotate-45" />
                        </div>
                        <span className="font-medium text-[13px]">{event.name}</span>
                      </div>
                      <span className="cfj-mono text-[#B03B3B] font-medium text-[15px]">{event.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projections Card */}
        <div className="mt-4 bg-[#1A1A18] text-[#F9F9F8] rounded-2xl p-6 mx-6 mb-12 relative overflow-hidden shadow-lg">
          <div className="relative z-10">
            <h3 className="cfj-serif text-[22px] mb-5 italic">Looking Ahead</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-[#333] pb-3">
                <span className="text-[13px] text-[#AAA]">End of Week</span>
                <span className="cfj-mono text-[17px] text-white tracking-tight">$1,980</span>
              </div>
              <div className="flex justify-between items-end border-b border-[#333] pb-3">
                <span className="text-[13px] text-[#AAA]">End of Month</span>
                <span className="cfj-mono text-[17px] text-white tracking-tight">$6,100</span>
              </div>
              <div className="flex justify-between items-end pb-1">
                <span className="text-[13px] text-[#AAA]">End of Year</span>
                <span className="cfj-mono text-[17px] text-[#2E6B4B] tracking-tight">$62,000</span>
              </div>
            </div>
          </div>
          {/* Decorative background glow */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-gradient-to-br from-[#ffffff08] to-transparent rounded-full blur-2xl"></div>
        </div>

      </div>
    </div>
  );
}
