import { useState, useEffect } from 'react';
import { Action, Role } from './types';
import { ROLES, POSSIBLE_THEMES } from './lib/gameData';
import { createInitialState, applyActionToMetrics, applyNaturalDrift, checkEnding, checkWinners } from './lib/gameEngine';
import PlayScreen from './components/PlayScreen';
import YearRecapScreen from './components/YearRecapScreen';
import EndScreen from './components/EndScreen';

export default function App() {
  const [gameState, setGameState] = useState(createInitialState());
  const [showRecap, setShowRecap] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!gameState.gameOver && !gameState.currentScenario && !gameState.isGeneratingScenario && !showRecap && !errorMsg) {
      setGameState(prev => ({ ...prev, isGeneratingScenario: true }));
      fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: gameState.currentYear,
          currentMetrics: gameState.metrics,
          theme: POSSIBLE_THEMES[Math.floor(Math.random() * POSSIBLE_THEMES.length)]
        })
      })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate scenario');
        }
        if (!data.scenario || !data.actions) {
          throw new Error('Invalid response format from AI');
        }
        return data;
      })
      .then(data => {
        setGameState(prev => ({
          ...prev,
          currentScenario: data.scenario,
          currentAvailableActions: data.actions,
          isGeneratingScenario: false
        }));
      })
      .catch(err => {
        console.error(err);
        setErrorMsg(err.message || 'Failed to fetch scenario from server.');
        setGameState(prev => ({ ...prev, isGeneratingScenario: false }));
      });
    }
  }, [gameState.currentYear, gameState.gameOver, gameState.currentScenario, gameState.isGeneratingScenario, showRecap, gameState.metrics, errorMsg]);

  const handleActionSelect = (action: Action) => {
    const currentRole = ROLES[gameState.currentRoleIndex];
    
    setGameState(prev => {
      const newState = { ...prev, currentTurnActions: { ...prev.currentTurnActions } };
      newState.currentTurnActions[currentRole] = action;
      
      // Update metrics immediately for animation
      let newMetrics = applyActionToMetrics(prev.metrics, action);
      newState.metrics = newMetrics;
      
      if (newState.currentRoleIndex < ROLES.length - 1) {
        newState.currentRoleIndex += 1;
      } else {
        // All roles have played. Apply natural drift and fetch recap.
        newMetrics = applyNaturalDrift(newMetrics);
        newState.metrics = newMetrics;

        newState.isGeneratingRecap = true;

        fetch('/api/recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: prev.currentYear,
            actionsTaken: newState.currentTurnActions
          })
        })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to fetch recap');
          return data;
        })
        .then(data => {
          updateStateAfterRecap(data.feed || []);
        })
        .catch(err => {
          console.error(err);
          // Fallback if API fails: still update the state but with empty feed
          updateStateAfterRecap([]);
        });

        function updateStateAfterRecap(feed: any[]) {
          setGameState(curr => {
            const historyObj = {
              year: curr.currentYear,
              metrics: { ...newMetrics },
              actionsTaken: { ...curr.currentTurnActions },
              feed: feed
            };

            const possibleEnding = checkEnding(newMetrics);
            const isGameOver = possibleEnding !== null || curr.currentYear >= curr.maxYears;
            const ending = isGameOver ? (possibleEnding !== null ? possibleEnding : 'survive') : null;
            const winners = isGameOver ? checkWinners(newMetrics) : [];

            return {
              ...curr,
              history: [...curr.history, historyObj],
              metrics: newMetrics,
              gameOver: isGameOver,
              ending: ending,
              winners: winners,
              isGeneratingRecap: false
            };
          });
          setShowRecap(true);
        }
      }
      return newState;
    });
  };

  const handleNextYear = () => {
    setGameState(prev => ({
      ...prev,
      currentYear: prev.currentYear + 1,
      currentRoleIndex: 0,
      currentTurnActions: {
        'Pemerintah': null,
        'Bank Sentral': null,
        'Pengusaha': null,
        'Serikat Buruh': null,
        'Masyarakat': null
      },
      currentScenario: null,
      currentAvailableActions: null
    }));
    setShowRecap(false);
  };

  let content;
  if (gameState.gameOver && !showRecap) {
    content = (
      <EndScreen state={gameState} onRestart={() => {
        setGameState(createInitialState());
        setShowRecap(false);
      }} />
    );
  } else if (showRecap) {
    content = (
      <YearRecapScreen state={gameState} onNextYear={() => {
        if (gameState.gameOver) {
          setShowRecap(false);
        } else {
          handleNextYear();
        }
      }} />
    );
  } else {
    const currentRole = ROLES[gameState.currentRoleIndex];
    content = (
      <div className="h-full flex items-center justify-center">
        {errorMsg ? (
          <div className="max-w-md bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => {
                setErrorMsg(null);
              }}
              className="bg-[#c91212] hover:bg-[#a00e0e] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : (gameState.isGeneratingScenario || gameState.isGeneratingRecap) ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-12 h-12 border-4 border-red-200 border-t-[#c91212] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium uppercase tracking-widest text-sm">
              {gameState.isGeneratingScenario ? 'Meracik Krisis Tahun Ini...' : 'Menunggu Reaksi Netizen...'}
            </p>
          </div>
        ) : (
          gameState.currentScenario && gameState.currentAvailableActions && (
            <PlayScreen 
              currentRole={currentRole}
              year={gameState.currentYear}
              metrics={gameState.metrics}
              scenario={gameState.currentScenario}
              availableActions={gameState.currentAvailableActions[currentRole as keyof typeof gameState.currentAvailableActions]}
              onSelectAction={handleActionSelect}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F3F4F6] flex flex-col font-sans text-slate-900 overflow-hidden">
      <main className="flex-1 overflow-hidden relative">
        {content}
      </main>
    </div>
  );
}

