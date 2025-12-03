import React, { useState } from 'react';
import { LayoutDashboard, LayoutList, Users, Map as MapIcon, ChevronRight, Check, ChevronLeft, X } from 'lucide-react';

interface OnboardingTutorialProps {
  onFinish: () => void;
}

const steps = [
  {
    title: "Bem-vindo ao Gabinete Digital",
    description: "Sua plataforma completa para gestão de mandato. Centralize demandas, cidadãos e inteligência geográfica em um só lugar.",
    icon: LayoutDashboard,
    color: "bg-blue-500"
  },
  {
    title: "Gestão de Demandas",
    description: "Acompanhe solicitações em tempo real. Visualize por Lista, Kanban ou Calendário e nunca perca um prazo.",
    icon: LayoutList,
    color: "bg-brand-500"
  },
  {
    title: "Base de Cidadãos",
    description: "Conheça seu eleitorado. Mantenha um histórico completo de interações e localização de cada cidadão.",
    icon: Users,
    color: "bg-green-500"
  },
  {
    title: "Mapa Interativo",
    description: "Inteligência espacial. Identifique problemas por região e tome decisões estratégicas baseadas em dados.",
    icon: MapIcon,
    color: "bg-purple-500"
  }
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('next');
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection('prev');
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('geo_onboarding_completed', 'true');
    onFinish();
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative flex flex-col">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-white/10 z-10">
          <div 
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Skip Button (Top Right) */}
        <button 
            onClick={completeOnboarding}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-20 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full"
            title="Pular Tutorial"
        >
            <span className="text-xs font-bold uppercase tracking-wider mr-1">Pular</span>
            <X className="w-4 h-4 inline-block" />
        </button>

        <div className="p-8 flex flex-col items-center text-center flex-1">
          
          {/* Content Area with Animation Key */}
          <div key={currentStep} className={`flex flex-col items-center animate-in ${direction === 'next' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'} fade-in duration-300 fill-mode-both`}>
              {/* Icon Circle */}
              <div className={`w-24 h-24 rounded-3xl ${steps[currentStep].color} flex items-center justify-center shadow-xl shadow-brand-500/10 mb-8 transform transition-transform duration-500 hover:scale-105`}>
                <StepIcon className="w-12 h-12 text-white" />
              </div>

              {/* Text Content */}
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-slate-500 dark:text-white/60 mb-8 leading-relaxed text-sm md:text-base min-h-[80px]">
                {steps[currentStep].description}
              </p>
          </div>

          <div className="mt-auto w-full">
              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mb-8">
                {steps.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep ? 'bg-brand-600 w-8' : 'bg-slate-200 dark:bg-white/10 w-2'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Actions */}
              <div className="flex gap-3 items-center">
                {currentStep > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}
                
                <button 
                  onClick={handleNext}
                  className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
                >
                  {currentStep === steps.length - 1 ? 'Começar Agora' : 'Próximo'}
                  {currentStep === steps.length - 1 ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;