import { useState, useRef, useEffect } from 'react';
import { GameEngine, GameConfig } from './game/GameEngine';
import { sounds } from './audio/SoundManager';
import TitleScreen from './components/TitleScreen';
import HUD from './components/HUD';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [gameMode, setGameMode] = useState<'singleplayer' | 'multiplayer'>('singleplayer');

  const [config, setConfig] = useState<GameConfig>({
    graphicsQuality: 'medium',
    difficulty: 'normal',
    rainIntensity: 0.4,
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

  const handleUpdateHUD = () => {
    if (!engineRef.current) return;
    const eng = engineRef.current;
    setHealth(Math.round(eng.health));
    setHunger(Math.round(eng.hunger));
    setStamina(Math.round(eng.stamina));
    setTimeOfDay(eng.timeOfDay);
    setIsNight(eng.isNight);
    setInventory({ ...eng.inventory });
  };

  const handleAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => { setAlertMsg(prev => (prev === msg ? "" : prev)); }, 4500);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (!engineRef.current) {
      // Use fixed seed (42) for consistent world across all devices
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

  const handleStartGame = (mode: 'singleplayer' | 'multiplayer', playerName: string) => {
    sounds.init();
    setGameMode(mode);
    setInLobby(false);

    if (engineRef.current) {
      if (mode === 'multiplayer') {
        engineRef.current.multiplayer.playerName = playerName;
        engineRef.current.multiplayer.connect();
      }
      engineRef.current.start();
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlays */}
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
