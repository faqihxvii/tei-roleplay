import { useState, useEffect, useRef } from 'react';
import { Action, FeedPost, Role } from './types';
import { ROLES, POSSIBLE_THEMES } from './lib/gameData';
import { createInitialState, applyActionToMetrics, applyNaturalDrift, checkEnding, checkWinners } from './lib/gameEngine';
import PlayScreen from './components/PlayScreen';
import YearRecapScreen from './components/YearRecapScreen';
import EndScreen from './components/EndScreen';

export default function App() {
  const [gameState, setGameState] = useState(createInitialState());
  const [showRecap, setShowRecap] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recapErrorMsg, setRecapErrorMsg] = useState<string | null>(null);
  const [isRetryingRecap, setIsRetryingRecap] = useState(false);
  const recapRequestId = useRef(0);
  const scenarioRequestId = useRef(0);
  const scenarioController = useRef<AbortController | null>(null);
  const scenarioInFlight = useRef(false);
  const recapInFlight = useRef(false);
  const recapRetryPayload = useRef<{
    year: number;
    metrics: typeof gameState.metrics;
    actionsTaken: typeof gameState.currentTurnActions;
  } | null>(null);

  useEffect(() => {
    if (gameState.gameOver || gameState.currentScenario || gameState.isGeneratingScenario || showRecap || errorMsg || scenarioInFlight.current) return;

    const requestId = ++scenarioRequestId.current;
    const controller = new AbortController();
    scenarioController.current = controller;
    scenarioInFlight.current = true;
    setGameState(prev => ({ ...prev, isGeneratingScenario: true }));

    fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        year: gameState.currentYear,
        currentMetrics: gameState.metrics,
        theme: POSSIBLE_THEMES[Math.floor(Math.random() * POSSIBLE_THEMES.length)]
      })
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Skenario gagal dibuat.');
        if (!data.scenario || !data.actions) throw new Error('Respons skenario tidak valid.');
        return data;
      })
      .then(data => {
        if (scenarioRequestId.current !== requestId) return;
        setGameState(prev => ({
          ...prev,
          currentScenario: data.scenario,
          currentAvailableActions: data.actions,
          isGeneratingScenario: false
        }));
      })
      .catch(err => {
        if (scenarioRequestId.current !== requestId || controller.signal.aborted) return;
        console.error('Failed to generate scenario.', err);
        setErrorMsg(err instanceof Error ? err.message : 'Skenario gagal dibuat. Coba lagi.');
        setGameState(prev => ({ ...prev, isGeneratingScenario: false }));
      })
      .finally(() => {
        if (scenarioRequestId.current === requestId) {
          scenarioInFlight.current = false;
          scenarioController.current = null;
        }
      });
  }, [gameState.currentYear, gameState.gameOver, gameState.currentScenario, gameState.isGeneratingScenario, showRecap, gameState.metrics, errorMsg]);

  const generateRecap = async (
    year: number,
    metrics: typeof gameState.metrics,
    actionsTaken: typeof gameState.currentTurnActions,
    requestId: number,
    isRetry = false
  ) => {
    let feed: FeedPost[] = [];
    let failed = false;
    try {
      const response = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, actionsTaken })
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.feed)) throw new Error(data.error || 'Invalid recap response');
      feed = data.feed as FeedPost[];
    } catch (err) {
      failed = true;
      console.error('Failed to generate recap.', err);
    }

    if (recapRequestId.current !== requestId) return;

    if (isRetry) {
      if (failed) {
        setRecapErrorMsg('Feed reaksi belum berhasil dimuat. Silakan coba lagi.');
      } else {
        recapRetryPayload.current = null;
        setRecapErrorMsg(null);
        setGameState(current => ({
          ...current,
          history: current.history.map((record, index) =>
            index === current.history.length - 1 && record.year === year ? { ...record, feed } : record
          )
        }));
      }
      setIsRetryingRecap(false);
      recapInFlight.current = false;
      return;
    }

    if (failed) {
      recapRetryPayload.current = { year, metrics, actionsTaken };
      setRecapErrorMsg('Feed reaksi belum berhasil dimuat. Permainan tetap bisa dilanjutkan; Anda juga dapat mencoba lagi.');
    } else {
      recapRetryPayload.current = null;
      setRecapErrorMsg(null);
    }

    const possibleEnding = checkEnding(metrics);
    setGameState(current => {
      const isGameOver = possibleEnding !== null || year >= current.maxYears;
      const historyObj = {
        year,
        metrics: { ...metrics },
        actionsTaken: { ...actionsTaken },
        feed
      };

      return {
        ...current,
        history: [...current.history, historyObj],
        metrics,
        gameOver: isGameOver,
        ending: isGameOver ? (possibleEnding ?? 'survive') : null,
        winners: isGameOver ? checkWinners(metrics) : [],
        isGeneratingRecap: false
      };
    });
    setShowRecap(true);
    recapInFlight.current = false;
  };

  const handleRetryRecap = () => {
    const pending = recapRetryPayload.current;
    if (!pending || recapInFlight.current) return;

    recapInFlight.current = true;
    setIsRetryingRecap(true);
    const requestId = ++recapRequestId.current;
    void generateRecap(pending.year, pending.metrics, pending.actionsTaken, requestId, true);
  };

  const handleActionSelect = (action: Action) => {
    if (gameState.isGeneratingRecap || gameState.gameOver || recapInFlight.current) return;

    const currentRole = ROLES[gameState.currentRoleIndex];
    const actionsTaken = { ...gameState.currentTurnActions, [currentRole]: action };
    const metricsAfterAction = applyActionToMetrics(gameState.metrics, action);

    if (gameState.currentRoleIndex < ROLES.length - 1) {
      setGameState(current => ({
        ...current,
        currentTurnActions: actionsTaken,
        currentRoleIndex: gameState.currentRoleIndex + 1,
        metrics: metricsAfterAction
      }));
      return;
    }

    const finalMetrics = applyNaturalDrift(metricsAfterAction);
    recapInFlight.current = true;
    const requestId = ++recapRequestId.current;
    setGameState(current => ({
      ...current,
      currentTurnActions: actionsTaken,
      metrics: finalMetrics,
      isGeneratingRecap: true
    }));
    void generateRecap(gameState.currentYear, finalMetrics, actionsTaken, requestId);
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
    recapRequestId.current += 1;
    recapRetryPayload.current = null;
    setRecapErrorMsg(null);
    setIsRetryingRecap(false);
    setShowRecap(false);
  };

  let content;
  if (gameState.gameOver && !showRecap) {
    content = (
      <EndScreen state={gameState} onRestart={() => {
        scenarioRequestId.current += 1;
        scenarioController.current?.abort();
        scenarioInFlight.current = false;
        recapRequestId.current += 1;
        recapInFlight.current = false;
        recapRetryPayload.current = null;
        setGameState(createInitialState());
        setShowRecap(false);
        setErrorMsg(null);
        setRecapErrorMsg(null);
        setIsRetryingRecap(false);
      }} />
    );
  } else if (showRecap) {
    content = (
      <YearRecapScreen
        state={gameState}
        recapError={recapErrorMsg}
        isRetryingRecap={isRetryingRecap}
        onRetryRecap={handleRetryRecap}
        onNextYear={() => {
          if (gameState.gameOver) {
            recapRetryPayload.current = null;
            setRecapErrorMsg(null);
            setShowRecap(false);
          } else {
            handleNextYear();
          }
        }}
      />
    );
  } else {
    const currentRole = ROLES[gameState.currentRoleIndex];
    content = (
      <div className="h-full flex items-center justify-center">
        {errorMsg ? (
          <div role="alert" className="max-w-md bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-slate-600 mb-6">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
              }}
              className="bg-[#c91212] hover:bg-[#a00e0e] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : (gameState.isGeneratingScenario || gameState.isGeneratingRecap) ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center animate-pulse">
            <div aria-hidden="true" className="w-12 h-12 border-4 border-red-200 border-t-[#c91212] rounded-full animate-spin mb-4"></div>
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
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden relative">
        {content}
      </main>
    </div>
  );
}

