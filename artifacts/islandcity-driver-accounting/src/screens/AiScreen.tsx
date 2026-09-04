import { useState } from 'react';

interface AiScreenProps {
  entries: any[];
  goal: number;
}

export default function AiScreen({ entries, goal }: AiScreenProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startDate = period === 'day' ? startOfDay : period === 'week' ? startOfWeek : startOfMonth;

  const filtered = entries.filter((t: any) => new Date(t.datetime || t.date) >= startDate);

  const totalIncome = filtered.reduce((sum: number, t: any) => sum + (t.grossIncome || t.gross || 0), 0);
  const totalExpenses = filtered.reduce((sum: number, t: any) => sum + (t.expenseAmount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const tripCount = filtered.length;
  const avgPerTrip = tripCount > 0 ? totalIncome / tripCount : 0;

  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  const dailyAvg = totalIncome / daysInPeriod;
  const projectedMonthly = dailyAvg * 30;
  const projectedYearly = dailyAvg * 365;

  const getInsight = () => {
    if (netProfit < 0) return { emoji: '⚠️', text: 'Gastas más de lo que ganas. Reduce gastos o aumenta viajes.' };
    if (dailyAvg < 200) return { emoji: '💡', text: 'Apunta a $200/día mínimo. Enfócate en horas pico y zonas calientes.' };
    if (dailyAvg < 400) return { emoji: '📈', text: '¡Buen ritmo! Llega a $400/día optimizando puntos de recogida.' };
    return { emoji: '🔥', text: '¡Excelente! Sigue así con ese impulso.' };
  };

  const insight = getInsight();

  const stat = (label: string, value: string, color: string) => (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">AI Assistant</h1>
        <div className="flex bg-gray-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                period === p ? 'bg-yellow-400 text-black' : 'text-gray-400'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <div className="text-3xl mb-2">{insight.emoji}</div>
        <p className="text-gray-200 text-sm">{insight.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stat('Income', `$${totalIncome.toFixed(2)}`, 'text-green-400')}
        {stat('Expenses', `$${totalExpenses.toFixed(2)}`, 'text-red-400')}
        {stat('Net Profit', `$${netProfit.toFixed(2)}`, netProfit >= 0 ? 'text-green-400' : 'text-red-400')}
        {stat('Trips', `${tripCount}`, 'text-yellow-400')}
        {stat('Avg/Trip', `$${avgPerTrip.toFixed(2)}`, 'text-yellow-400')}
        {stat('Daily Avg', `$${dailyAvg.toFixed(2)}`, 'text-yellow-400')}
        <div className="bg-gray-800 rounded-xl p-3 col-span-2">
          <div className="text-gray-400 text-xs">Projected Monthly / Yearly</div>
          <div className="text-yellow-400 text-lg font-bold">
            ${projectedMonthly.toFixed(0)} / ${projectedYearly.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <div className="text-gray-400 text-xs mb-2">Goal Progress (${goal}/day)</div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-yellow-400 h-3 rounded-full"
            style={{ width: `${Math.min(100, (dailyAvg / goal) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">{Math.round((dailyAvg / goal) * 100)}% of goal</div>
      </div>
    </div>
  );
}