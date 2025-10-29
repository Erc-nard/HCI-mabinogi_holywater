import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// Data structure for an option template
interface OptionTemplate {
  name: string;
  type: 'stat' | 'set';
  range: [number, number];
  unit: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  probability: number;
}

// Data structure for a rolled option
interface RolledOption {
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// All possible options with their respective probabilities and tiers
// Probabilities are estimations based on typical game balance.
const OPTION_TEMPLATES: OptionTemplate[] = [
  // Legendary (Total: 0.5%)
  { name: '최대 대미지', type: 'stat', range: [21, 30], unit: '증가', tier: 'legendary', probability: 0.0015 },
  { name: '마법 공격력', type: 'stat', range: [21, 30], unit: '증가', tier: 'legendary', probability: 0.0015 },
  { name: '공격 속도 세트 효과', type: 'set', range: [1, 1], unit: '증가', tier: 'legendary', probability: 0.001 },
  { name: '배쉬 강화 세트 효과', type: 'set', range: [1, 1], unit: '증가', tier: 'legendary', probability: 0.0005 },
  { name: '매그넘 샷 강화 세트 효과', type: 'set', range: [1, 1], unit: '증가', tier: 'legendary', probability: 0.0005 },

  // Rare (Total: 4.5%)
  { name: '최대 대미지', type: 'stat', range: [11, 20], unit: '증가', tier: 'rare', probability: 0.005 },
  { name: '마법 공격력', type: 'stat', range: [11, 20], unit: '증가', tier: 'rare', probability: 0.005 },
  { name: '크리티컬', type: 'stat', range: [4, 5], unit: '% 증가', tier: 'rare', probability: 0.01 },
  { name: '크리티컬 대미지', type: 'stat', range: [3, 4], unit: '% 증가', tier: 'rare', probability: 0.01 },
  { name: '보호', type: 'stat', range: [2, 3], unit: '증가', tier: 'rare', probability: 0.005 },
  { name: '피어싱 저항', type: 'stat', range: [1, 1], unit: '증가', tier: 'rare', probability: 0.005 },
  { name: '음악 버프 효과', type: 'stat', range: [1, 1], unit: '증가', tier: 'rare', probability: 0.005 },

  // Uncommon (Total: 25%)
  { name: '최대 대미지', type: 'stat', range: [6, 10], unit: '증가', tier: 'uncommon', probability: 0.02 },
  { name: '마법 공격력', type: 'stat', range: [6, 10], unit: '증가', tier: 'uncommon', probability: 0.02 },
  { name: '4대 속성 연금 대미지', type: 'stat', range: [10, 30], unit: '증가', tier: 'uncommon', probability: 0.03 },
  { name: '마리오네트 최대 대미지', type: 'stat', range: [10, 30], unit: '증가', tier: 'uncommon', probability: 0.03 },
  { name: '크리티컬', type: 'stat', range: [1, 3], unit: '% 증가', tier: 'uncommon', probability: 0.05 },
  { name: '보호', type: 'stat', range: [1, 1], unit: '증가', tier: 'uncommon', probability: 0.05 },
  { name: '체력', type: 'stat', range: [15, 30], unit: '증가', tier: 'uncommon', probability: 0.025 },
  { name: '지력', type: 'stat', range: [15, 30], unit: '증가', tier: 'uncommon', probability: 0.025 },

  // Common (Total: 70%)
  { name: '최대 대미지', type: 'stat', range: [1, 5], unit: '증가', tier: 'common', probability: 0.07 },
  { name: '마법 공격력', type: 'stat', range: [1, 5], unit: '증가', tier: 'common', probability: 0.07 },
  { name: '생명력', type: 'stat', range: [1, 100], unit: '증가', tier: 'common', probability: 0.1 },
  { name: '마나', type: 'stat', range: [1, 100], unit: '증가', tier: 'common', probability: 0.1 },
  { name: '스태미나', type: 'stat', range: [1, 100], unit: '증가', tier: 'common', probability: 0.1 },
  { name: '체력', type: 'stat', range: [1, 15], unit: '증가', tier: 'common', probability: 0.04 },
  { name: '지력', type: 'stat', range: [1, 15], unit: '증가', tier: 'common', probability: 0.04 },
  { name: '솜씨', type: 'stat', range: [1, 15], unit: '증가', tier: 'common', probability: 0.04 },
  { name: '의지', type: 'stat', range: [1, 15], unit: '증가', tier: 'common', probability: 0.04 },
  { name: '행운', type: 'stat', range: [1, 15], unit: '증가', tier: 'common', probability: 0.04 },
  { name: '밸런스', type: 'stat', range: [1, 5], unit: '% 증가', tier: 'common', probability: 0.06 },
];


const TIER_CLASSES: { [key in RolledOption['tier']]: string } = {
  common: 'tier-common',
  uncommon: 'tier-uncommon',
  rare: 'tier-rare',
  legendary: 'tier-legendary',
};

const App = () => {
  const [price, setPrice] = useState<string>(() => localStorage.getItem('holyWaterPrice') || '1000000');
  const [tryCount, setTryCount] = useState<number>(0);
  const [currentOption, setCurrentOption] = useState<RolledOption | null>(null);
  const [history, setHistory] = useState<RolledOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [targetOption, setTargetOption] = useState<string>('');
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const simulationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('holyWaterPrice', price);
  }, [price]);

  const totalCost = useMemo(() => {
    const numericPrice = BigInt(price.replace(/,/g, '') || '0');
    return BigInt(tryCount) * numericPrice;
  }, [tryCount, price]);

  const uniqueOptionNames = useMemo(() => {
    const names = new Set(OPTION_TEMPLATES.map(opt => opt.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const getRandomOption = useCallback((): RolledOption => {
    let random = Math.random() * OPTION_TEMPLATES.reduce((sum, t) => sum + t.probability, 0);
    let selectedTemplate: OptionTemplate | null = null;

    for (const template of OPTION_TEMPLATES) {
      if (random < template.probability) {
        selectedTemplate = template;
        break;
      }
      random -= template.probability;
    }

    if (!selectedTemplate) {
      selectedTemplate = OPTION_TEMPLATES[OPTION_TEMPLATES.length - 1]; // Fallback
    }
    
    const [min, max] = selectedTemplate.range;
    // Power-law distribution to make higher rolls rarer. The exponent can be tweaked.
    const skewedRandom = Math.pow(Math.random(), 2.5); 
    const value = min + Math.floor(skewedRandom * (max - min + 1));
    
    const finalName = `${selectedTemplate.name} ${value}${selectedTemplate.unit.startsWith('%') ? '' : ' '}${selectedTemplate.unit}`;

    return {
        name: finalName,
        tier: selectedTemplate.tier,
    };
  }, []);

  const runSimulationStep = useCallback(() => {
    const newOption = getRandomOption();
    setTryCount(prev => prev + 1);
    setCurrentOption(newOption);
    setHistory(prev => [newOption, ...prev].slice(0, 100));
    return newOption;
  }, [getRandomOption]);
  
  const handleSimulate = useCallback(() => {
    if (isSimulating || isAutoSimulating) return;
    setIsSimulating(true);
    setTimeout(() => {
      runSimulationStep();
      setIsSimulating(false);
    }, 100);
  }, [runSimulationStep, isSimulating, isAutoSimulating]);

  const handleStopAutoSimulate = useCallback(() => {
    if (simulationIntervalRef.current) {
        clearTimeout(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
    }
    setIsAutoSimulating(false);
  }, []);

  const handleAutoSimulate = useCallback(() => {
      if (!targetOption) return;
      setIsAutoSimulating(true);

      const autoSimulateLoop = () => {
          const newOption = runSimulationStep();
          if (newOption.name.startsWith(targetOption)) {
              handleStopAutoSimulate();
          } else {
              simulationIntervalRef.current = window.setTimeout(autoSimulateLoop, 0);
          }
      };
      autoSimulateLoop();
  }, [targetOption, runSimulationStep, handleStopAutoSimulate]);
  
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearTimeout(simulationIntervalRef.current);
      }
    };
  }, []);

  const handleReset = useCallback(() => {
    handleStopAutoSimulate();
    setTryCount(0);
    setCurrentOption(null);
    setHistory([]);
    setTargetOption('');
  }, [handleStopAutoSimulate]);

  const formatNumber = (num: string | number | bigint) => {
    if (typeof num === 'string') {
      if (num === '') return '';
      const sanitizedNum = num.replace(/,/g, '');
      if (/^\d+$/.test(sanitizedNum)) {
        return BigInt(sanitizedNum).toLocaleString('ko-KR');
      }
      return num;
    }
    return num.toLocaleString('ko-KR');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(value)) || value === '') {
        setPrice(value);
    }
  };

  const ProbabilityModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
          <h3 className="text-xl font-bold text-yellow-400">옵션 확률표</h3>
          <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <div className="p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="py-2">옵션</th>
                <th className="py-2">적용 수치 범위</th>
                <th className="py-2">등급</th>
                <th className="py-2 text-right">확률</th>
              </tr>
            </thead>
            <tbody>
              {OPTION_TEMPLATES.map((option, index) => (
                <tr key={index} className="border-b border-gray-700 last:border-b-0">
                  <td className={`py-3 ${TIER_CLASSES[option.tier]}`}>{option.name}</td>
                  <td className="py-3 text-gray-300">
                    {option.range[0] === option.range[1] 
                      ? `${option.range[0]}${option.unit}`
                      : `${option.range[0]} ~ ${option.range[1]}${option.unit}`
                    }
                  </td>
                  <td className={`py-3 capitalize ${TIER_CLASSES[option.tier]}`}>{option.tier}</td>
                  <td className="py-3 text-right text-gray-300">{(option.probability * 100).toFixed(4)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
        <main className="max-w-7xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 tracking-wider">마비노기 성수 시뮬레이터</h1>
            <p className="text-gray-400 mt-2 text-lg">원하는 옵션을 얻기까지의 여정을 미리 체험해보세요.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <section aria-labelledby="controls-heading" className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-4 h-fit order-2 lg:order-1">
              <h2 id="controls-heading" className="sr-only">시뮬레이터 제어판</h2>
              <div>
                <label htmlFor="price-input" className="block text-sm font-medium text-gray-300 mb-2">성수 개당 가격 (골드)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <i className="fa-solid fa-coins"></i>
                  </span>
                  <input
                    type="text"
                    id="price-input"
                    value={formatNumber(price)}
                    onChange={handlePriceChange}
                    className="w-full bg-gray-700 border-gray-600 rounded-md pl-10 pr-4 py-2 text-white focus:ring-yellow-500 focus:border-yellow-500"
                    aria-label="성수 개당 가격"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="target-option" className="block text-sm font-medium text-gray-300 mb-2">목표 옵션 (자동 실행용)</label>
                <select
                    id="target-option"
                    value={targetOption}
                    onChange={(e) => setTargetOption(e.target.value)}
                    disabled={isAutoSimulating}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <option value="">-- 목표 옵션 선택 --</option>
                    {uniqueOptionNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setIsModalOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-table-list"></i>확률 보기
                  </button>
                  <button onClick={handleReset} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-rotate-left"></i>초기화
                  </button>
              </div>
              
              <button 
                onClick={isAutoSimulating ? handleStopAutoSimulate : handleAutoSimulate}
                disabled={!targetOption}
                className={`w-full text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 ${isAutoSimulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                  {isAutoSimulating ? <><i className="fa-solid fa-stop"></i>자동 실행 중지</> : <><i className="fa-solid fa-forward-fast"></i>목표까지 자동 실행</>}
              </button>
              
               <div className="mt-2 border-t border-gray-700 pt-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                      <span className="text-gray-400">총 시도 횟수:</span>
                      <span className="text-2xl font-bold text-white">{formatNumber(tryCount)}회</span>
                  </div>
                   <div className="flex justify-between items-baseline">
                      <span className="text-gray-400">총 사용 골드:</span>
                      <span className="text-2xl font-bold text-yellow-400">{formatNumber(totalCost)} G</span>
                  </div>
              </div>
            </section>
            <section aria-live="polite" className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-between order-1 lg:order-2">
              <h2 className="text-xl font-bold text-gray-300">현재 옵션</h2>
              <div className="flex-grow flex items-center justify-center text-center py-4">
                {currentOption ? (
                  <p className={`text-3xl md:text-4xl font-bold option-appear ${TIER_CLASSES[currentOption.tier]}`}>
                    {currentOption.name}
                  </p>
                ) : (
                  <p className="text-2xl text-gray-500">버튼을 눌러 시뮬레이션을 시작하세요.</p>
                )}
              </div>
              <button onClick={handleSimulate} disabled={isSimulating || isAutoSimulating} className="w-full max-w-xs bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-lg text-lg transition duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4">
                <i className="fa-solid fa-wand-magic-sparkles"></i>{isSimulating ? '적용 중...' : '성수 사용하기'}
              </button>
            </section>
          </div>

          <section aria-labelledby="history-heading" className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 id="history-heading" className="text-xl font-bold text-gray-300 mb-4">옵션 기록</h2>
            <div className="h-64 bg-gray-900 rounded-md p-3 overflow-y-auto">
                {history.length > 0 ? (
                    <ul>
                        {history.map((opt, index) => (
                            <li key={index} className={`py-1 ${index === 0 ? 'opacity-100' : 'opacity-70'}`}>
                                <span className="text-gray-500 mr-2">{tryCount - index}회차:</span>
                                <span className={TIER_CLASSES[opt.tier]}>{opt.name}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">기록이 없습니다.</div>
                )}
            </div>
          </section>
        </main>
      </div>
      {isModalOpen && <ProbabilityModal />}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);