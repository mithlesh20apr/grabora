import React, { useCallback } from 'react';

export interface SellerOnboardingStep {
  completed: boolean;
  cta: string;
}

export interface SellerOnboardingStatus {
  allCompleted: boolean;
  steps: {
    [key: string]: SellerOnboardingStep;
  };
}

interface OnboardingCardProps {
  router: any;
  onboardingStatus: SellerOnboardingStatus;
  refetchOnboardingStatus?: () => void;
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({ router, onboardingStatus, refetchOnboardingStatus }) => {
  const stepKeys = Object.keys(onboardingStatus.steps);
  const steps = stepKeys.map((key) => ({ key, ...onboardingStatus.steps[key] }));
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const handleStepClick = useCallback((cta: string) => {
    router.push(cta);
    if (refetchOnboardingStatus) {
      setTimeout(() => {
        refetchOnboardingStatus();
      }, 1000);
    }
  }, [router, refetchOnboardingStatus]);

  if (onboardingStatus.allCompleted) return null;

  return (
    <div className="relative bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#1e293b] rounded-2xl border border-white/10 p-6 shadow-2xl overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f26322] rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl"></div>
      </div>
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#f26322]/25">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Getting Started</h3>
              <p className="text-sm text-gray-400">Complete these steps to start selling</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#f26322] rounded-full animate-pulse"></div>
              <span className="text-lg font-bold text-white">{completedCount}/{steps.length}</span>
            </div>
            <span className="text-xs text-gray-300 font-medium">completed</span>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
            <span className="text-sm font-bold text-[#f26322]">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#f26322] rounded-full transition-all duration-700 ease-out shadow-lg shadow-[#f26322]/50"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                step.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-white/5 border-white/10 hover:border-[#f26322]/50 hover:bg-white/10'
              }`}
            >
              <div className="absolute top-3 right-3 text-xs font-bold text-white/20">
                {index + 1}
              </div>
              <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                step.completed
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/25'
                  : 'bg-white/5 text-gray-400 group-hover:bg-[#f26322]/20 group-hover:text-[#f26322]'
              }`}>
                {step.completed ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-2xl">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold mb-0.5 transition-colors ${
                  step.completed
                    ? 'text-emerald-400 line-through'
                    : 'text-white group-hover:text-[#f26322]'
                }`}>
                  {step.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </p>
                {!step.completed && (
                  <button
                    type="button"
                    onClick={() => handleStepClick(step.cta)}
                    className="mt-1 px-3 py-1.5 bg-[#f26322] hover:bg-[#e05512] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Complete Now
                  </button>
                )}
                {step.completed && (
                  <p className="text-xs text-emerald-400/60">Completed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingCard;
