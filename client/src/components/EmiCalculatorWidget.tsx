import React from 'react';
import { Calculator, IndianRupee, ShieldCheck, AlertCircle } from 'lucide-react';

interface EmiCalculatorWidgetProps {
  loanAmount: number | null;
  tenureYears: number | null;
  indicativeRoiPercent?: number;
}

export const EmiCalculatorWidget: React.FC<EmiCalculatorWidgetProps> = ({
  loanAmount,
  tenureYears,
  indicativeRoiPercent = 9.75 // Realistic Home Credit Loan Against Property standard rate
}) => {
  if (!loanAmount || loanAmount <= 0) return null;

  const tenure = tenureYears && tenureYears >= 3 && tenureYears <= 15 ? tenureYears : 10;
  const monthlyRate = (indicativeRoiPercent / 12) / 100;
  const totalMonths = tenure * 12;

  // EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
    (Math.pow(1 + monthlyRate, totalMonths) - 1)
  );

  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - loanAmount;
  const isCapExceeded = loanAmount > 7500000;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-sm border border-slate-700/80 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Indicative LAP Financial Breakdown
          </span>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
          {indicativeRoiPercent}% p.a.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Requested Principal</span>
          <span className="text-base font-extrabold text-white tracking-tight">
            ₹{loanAmount.toLocaleString('en-IN')}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block uppercase">Estimated Monthly EMI</span>
          <span className="text-base font-extrabold text-emerald-400 tracking-tight">
            ₹{emi.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-300">/ mo</span>
          </span>
        </div>
      </div>

      {/* Visual Proportion Bar (Principal vs Interest) */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden flex">
          <div
            className="bg-red-500 h-full"
            style={{ width: `${Math.round((loanAmount / totalPayment) * 100)}%` }}
            title="Principal Amount"
          />
          <div
            className="bg-amber-400 h-full"
            style={{ width: `${Math.round((totalInterest / totalPayment) * 100)}%` }}
            title="Total Interest"
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Principal ({Math.round((loanAmount / totalPayment) * 100)}%)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Interest ({Math.round((totalInterest / totalPayment) * 100)}%)</span>
          </span>
        </div>
      </div>

      {/* Loan Policy Cap Status */}
      <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-700/60">
        <span className="text-slate-400">Policy Limit (₹75 Lakhs):</span>
        {isCapExceeded ? (
          <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Exceeds Standard Cap</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Within Max Cap</span>
          </span>
        )}
      </div>
    </div>
  );
};
