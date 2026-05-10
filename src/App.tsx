import { useState, useRef, useEffect, useCallback } from 'react';
import { GameEngine, GameConfig } from './game/GameEngine';
import { sounds } from './audio/SoundManager';
import TitleScreen from './components/TitleScreen';
import HUD from './components/HUD';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [gameMode, setGameMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const [config, setConfig] = useState<GameConfig>({
    graphicsQuality: isMobile ? 'low' : 'medium',
    difficulty: 'normal',
    rainIntensity: isMobile ? 0.1 : 0.4,
    daySpeed: 1.0,
  });

  const [health, setHealth] = useState(100);
  const [hunger, setHunger] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [timeOfDay, setTimeOfDay] = useState(0.3);
  const [isNight, setIsNight] = useState(false);
  const [alertMsg, setAlertMsg] = useState("Welcome to Mistfall. Break trees to craft tools!");
  const [inventory, setInventory] = useState({
    wood: 8, stone: 5, rawMeat: 0, cookedMeat: 0, carrot: 0, berries: 0,
    mushroom: 0, crystal: 0, gold: 0, axe: false, pickaxe: false, sword: false,
    workbench: false, furnaceCount: 0, campfireCount: 0,
  });

  const handleUpdateHUD = useCallback(() => {
    if (!engineRef.current) return;
    const eng = engineRef.current;
    setHealth(Math.round(eng.health));
    setHunger(Math.round(eng.hunger));
    setStamina(Math.round(eng.stamina));
    setTimeOfDay(eng.timeOfDay);
    setIsNight(eng.isNight);
    setInventory({ ...eng.inventory });

    // Auto-save session in multiplayer
    if (eng.multiplayer.connected && eng.multiplayer.shouldSave) {
      const state = eng.getPlayerState();
      eng.multiplayer.saveSession({
        x: state.x, y: state.y, z: state.z,
        health: state.health, hunger: state.hunger, stamina: state.stamina,
        timeOfDay: state.timeOfDay, inventory: state.inventory as unknown as Record<string, unknown>
      });
      eng.multiplayer.resetSaveTimer();
    }
  }, []);

  const handleAlert = useCallback((msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => { setAlertMsg(prev => (prev === msg ? "" : prev)); }, 4500);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new GameEngine(
        containerRef.current, config, handleUpdateHUD, handleAlert, 42
      );
    }
    return () => { if (engineRef.current) engineRef.current.pause(); };
  }, []);

  const handleUpdateConfig = (newCfg: Partial<GameConfig>) => {
    const updated = { ...config, ...newCfg };
    setConfig(updated);
    if (engineRef.current) engineRef.current.setConfigParameters(newCfg);
  };

  const handleStartGame = async (mode: 'singleplayer' | 'multiplayer', playerName: string) => {
    sounds.init();
    setGameMode(mode);
    setInLobby(false);

    if (engineRef.current) {
      if (mode === 'multiplayer') {
        engineRef.current.multiplayer.playerName = playerName;
        // Set up session loaded callback BEFORE connecting
        engineRef.current.multiplayer.onSessionLoaded = (session) => {
          if (engineRef.current) {
            engineRef.current.loadPlayerState({
              x: session.x, y: session.y, z: session.z,
              health: session.health, hunger: session.hunger,
              stamina: session.stamina, timeOfDay: session.timeOfDay
            });
            if (session.inventory) {
              engineRef.current.loadInventory(session.inventory as any);
            }
            handleAlert("📦 Session restored! Welcome back, " + playerName + "!");
          }
        };
        await engineRef.current.multiplayer.connect();
      }
      engineRef.current.start();
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <div ref={containerRef} className="absolute inset-0" />
      {inLobby ? (
        <TitleScreen config={config} onUpdateConfig={handleUpdateConfig} onStart={handleStartGame} />
      ) : (
        engineRef.current && (
          <HUD
            engine={engineRef.current}
            health={health} hunger={hunger} stamina={stamina}
            timeOfDay={timeOfDay} isNight={isNight}
            inventory={inventory} alertMsg={alertMsg}
            rainIntensity={config.rainIntensity}
            isMultiplayer={gameMode === 'multiplayer'}
          />
        )
      )}
    </div>
  );
}
