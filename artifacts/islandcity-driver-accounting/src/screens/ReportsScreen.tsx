import { useState } from 'react';
import type { EntryRecord } from '../lib/domain';

interface Props {
  entries: EntryRecord[];
}

type Period = 'day' | 'week' | 'month';

export default function ReportsScreen({ entries }: Props) {
  const [period, setPeriod] = useState<Period>('week');

  const now = Date.now();
  const dayMs = 86400000;
  const startOf = period === 'day' ? now - dayMs
    : period === 'week' ? now - 7 * dayMs
    : now - 30 * dayMs;

  const filtered = entries.filter(e => new Date(e.datetime).getTime() >= startOf);
  const gross = filtered.reduce((s, e) => s + e.grossIncome, 0);
  const net = filtered.reduce((s, e) => s + e.netPayout, 0);
  const tolls = filtered.reduce((s, e) => s + (e.toll ?? 0), 0);
  const trips = filtered.length;
  const avg = trips > 0 ? net / trips : 0;

  const byPlatform: Record<string, { trips: number; net: number }> = {};
  filtered.forEach(e => {
    const p = e.platform || 'Other';
    if (!byPlatform[p]) byPlatform[p] = { trips: 0, net: 0 };
    byPlatform[p].trips++;
    byPlatform[p].net += e.netPayout;
  });

  const irsRate = 0.725;
  const deductibleMiles = filtered.length * 12;
  const irsCredit = deductibleMiles * irsRate;

  return (
    <div className="p-4 pb-24 space-y-4">
      <h2 className="text-xl font-bold text-white">Reports</h2>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {(['day', 'week', 'month'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded text-sm font-semibold capitalize ${period === p ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Gross Income</p>
          <p className="text-lg font-bold text-white">${gross.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Net Payout</p>
          <p className="text-lg font-bold text-green-400">${net.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Trips</p>
          <p className="text-lg font-bold text-white">{trips}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Avg / Trip</p>
          <p className="text-lg font-bold text-white">${avg.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">Tolls</p>
          <p className="text-lg font-bold text-orange-400">${tolls.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400">IRS Credit</p>
          <p className="text-lg font-bold text-yellow-400">${irsCredit.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-white mb-2">By Platform</h3>
        {Object.entries(byPlatform).map(([p, d]) => (
          <div key={p} className="flex justify-between py-1 text-sm">
            <span className="text-gray-300">{p}</span>
            <span className="text-white font-medium">{d.trips} trips · ${d.net.toFixed(2)}</span>
          </div>
        ))}
        {Object.keys(byPlatform).length === 0 && <p className="text-gray-500 text-sm">No trips in this period</p>}
      </div>

      <div className="bg-gray-800 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-white mb-1">Tax Summary</h3>
        <p className="text-xs text-gray-400">Est. deductible miles: {deductibleMiles} mi × ${irsRate}/mi</p>
        <p className="text-xs text-gray-400">Est. tax credit: <span className="text-yellow-400 font-bold">${irsCredit.toFixed(2)}</span></p>
      </div>
    </div>
  );
}