import { useState } from 'react';
import type { GameConfig } from '../game/GameEngine';

interface Props {
  config: GameConfig;
  onUpdateConfig: (c: Partial<GameConfig>) => void;
  onStart: (mode: 'singleplayer' | 'multiplayer', playerName: string, skin: { hat: number; body: number; pants: number }) => void;
}

const difficultyInfo: Record<string, { icon: string; desc: string }> = {
  peaceful: { icon: '🕊️', desc: 'No enemies' },
  normal: { icon: '⚔️', desc: 'Balanced' },
  hard: { icon: '💀', desc: 'Wolves + extra' },
};

const SKIN_COLORS = [
  { hex: 0xd9534f, label: 'Red', css: '#d9534f' },
  { hex: 0x5bc0de, label: 'Cyan', css: '#5bc0de' },
  { hex: 0xf0ad4e, label: 'Gold', css: '#f0ad4e' },
  { hex: 0x5cb85c, label: 'Green', css: '#5cb85c' },
  { hex: 0x8855cc, label: 'Purple', css: '#8855cc' },
  { hex: 0xff69b4, label: 'Pink', css: '#ff69b4' },
  { hex: 0x333333, label: 'Black', css: '#333333' },
  { hex: 0xeeeeee, label: 'White', css: '#eeeeee' },
];

const BODY_COLORS = [
  { hex: 0x3d5a40, label: 'Forest', css: '#3d5a40' },
  { hex: 0x334e68, label: 'Navy', css: '#334e68' },
  { hex: 0x5a3a2a, label: 'Brown', css: '#5a3a2a' },
  { hex: 0x8b0000, label: 'Crimson', css: '#8b0000' },
  { hex: 0x2b2b6b, label: 'Royal', css: '#2b2b6b' },
  { hex: 0x444444, label: 'Gray', css: '#444444' },
];

const PANTS_COLORS = [
  { hex: 0x2b2b2b, label: 'Dark', css: '#2b2b2b' },
  { hex: 0x1a3a5c, label: 'Denim', css: '#1a3a5c' },
  { hex: 0x3a2a1a, label: 'Khaki', css: '#3a2a1a' },
  { hex: 0x555555, label: 'Gray', css: '#555555' },
];

const TitleScreen: React.FC<Props> = ({ config, onUpdateConfig, onStart }) => {
  const [mode, setMode] = useState<'menu' | 'singleplayer' | 'multiplayer'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [activeTab, setActiveTab] = useState<'world' | 'skin' | 'settings'>('world');
  const [skinHat, setSkinHat] = useState(0xd9534f);
  const [skinBody, setSkinBody] = useState(0x3d5a40);
  const [skinPants, setSkinPants] = useState(0x2b2b2b);

  const handlePlay = () => {
    const name = playerName.trim() || `Survivor_${Math.floor(Math.random() * 9999)}`;
    onStart(mode === 'menu' ? 'singleplayer' : mode, name, { hat: skinHat, body: skinBody, pants: skinPants });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, rgba(8,16,12,0.95) 0%, rgba(15,25,20,0.92) 50%, rgba(10,20,15,0.95) 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10 animate-float"
            style={{ width: 4 + Math.random() * 8, height: 4 + Math.random() * 8,
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#4ade80' : i % 3 === 1 ? '#38bdf8' : '#a78bfa',
              animationDelay: `${i * 0.3}s`, animationDuration: `${3 + Math.random() * 4}s` }} />
        ))}
      </div>
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        <div className="text-center mb-4 animate-fade-in-up">
          <div className="text-5xl sm:text-6xl font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #4ade80, #38bdf8, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(74,222,128,0.3))' }}>Mistfall</div>
          <div className="text-xs tracking-[0.35em] text-emerald-400/60 font-medium mt-1 uppercase">Survival • Craft • Explore</div>
        </div>
        {mode === 'menu' ? (
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <button onClick={() => setMode('singleplayer')}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98] group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-2xl shrink-0">🌲</div>
              <div className="text-left"><div className="text-white font-bold text-lg">Singleplayer</div>
                <div className="text-white/40 text-xs">Your own persistent world</div></div>
              <div className="ml-auto text-white/20 group-hover:text-white/50 transition-colors text-xl">→</div>
            </button>
            <button onClick={() => setMode('multiplayer')}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98] group cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-2xl shrink-0">🌐</div>
              <div className="text-left"><div className="text-white font-bold text-lg">Multiplayer</div>
                <div className="text-white/40 text-xs">Shared world · PvP · Chat</div></div>
              <div className="ml-auto text-white/20 group-hover:text-white/50 transition-colors text-xl">→</div>
            </button>
            <div className="glass-dark rounded-xl p-3 text-center mt-4">
              <div className="text-white/30 text-[10px] leading-relaxed">
                Procedural world • Custom shaders • Clouds • Day/night • PvP combat<br/>5 animal species • 3 enemy types • No downloads required
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setMode('menu')}
                className="glass rounded-xl w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer">←</button>
              <div className="text-white font-bold text-sm uppercase tracking-wider">
                {mode === 'multiplayer' ? '🌐 Multiplayer' : '🌲 Singleplayer'} Setup
              </div>
            </div>
            {mode === 'multiplayer' && (
              <div className="glass rounded-xl p-3 mb-3">
                <label className="text-white/50 text-xs mb-1.5 block">Your Name</label>
                <input type="text" maxLength={15} value={playerName} onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter a name..." className="w-full bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-emerald-400/40 transition-colors placeholder:text-white/20" />
                <div className="text-[9px] text-white/25 mt-1">Same name = same saved session</div>
              </div>
            )}
            <div className="flex gap-1.5 mb-3">
              {(['world', 'skin', 'settings'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20' : 'glass text-white/40 hover:text-white/60'}`}>
                  {tab === 'world' ? '🗺️ World' : tab === 'skin' ? '👤 Skin' : '⚙️ Settings'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pb-20">
              {activeTab === 'world' ? (<>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2 flex items-center gap-1.5">⚔️ Difficulty</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['peaceful', 'normal', 'hard'] as const).map(diff => {
                      const info = difficultyInfo[diff]; const selected = config.difficulty === diff;
                      return (<button key={diff} onClick={() => onUpdateConfig({ difficulty: diff })}
                        className={`rounded-lg py-2 px-1 text-center transition-all cursor-pointer ${selected ? 'bg-emerald-500/20 border border-emerald-400/30 text-white' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
                        <div className="text-lg">{info.icon}</div><div className="text-[10px] font-bold capitalize">{diff}</div>
                        <div className="text-[8px] opacity-50">{info.desc}</div></button>);
                    })}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/70 text-xs font-bold">🌧️ Rainfall</span>
                    <span className="text-emerald-300 text-xs">{Math.round(config.rainIntensity * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={config.rainIntensity}
                    onChange={e => onUpdateConfig({ rainIntensity: parseFloat(e.target.value) })}
                    className="w-full bg-stone-800 rounded-full cursor-pointer accent-cyan-400" />
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">🌅 Day/Night Speed</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{ val: 0.5, label: 'Slow' }, { val: 1.0, label: 'Normal' }, { val: 2.0, label: 'Fast' }].map(opt => (
                      <button key={opt.val} onClick={() => onUpdateConfig({ daySpeed: opt.val })}
                        className={`rounded-lg py-2 text-center text-xs transition-all cursor-pointer ${
                          config.daySpeed === opt.val ? 'bg-emerald-500/20 border border-emerald-400/30 text-white font-bold' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
                        {opt.label}</button>
                    ))}
                  </div>
                </div>
              </>) : activeTab === 'skin' ? (<>
                {/* Skin customizer */}
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">🎩 Hat Color</div>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_COLORS.map(c => (
                      <button key={c.hex} onClick={() => setSkinHat(c.hex)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer ${skinHat === c.hex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ background: c.css }} title={c.label} />
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">🧥 Jacket Color</div>
                  <div className="flex flex-wrap gap-2">
                    {BODY_COLORS.map(c => (
                      <button key={c.hex} onClick={() => setSkinBody(c.hex)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer ${skinBody === c.hex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ background: c.css }} title={c.label} />
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">👖 Pants Color</div>
                  <div className="flex flex-wrap gap-2">
                    {PANTS_COLORS.map(c => (
                      <button key={c.hex} onClick={() => setSkinPants(c.hex)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer ${skinPants === c.hex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ background: c.css }} title={c.label} />
                    ))}
                  </div>
                </div>
                {/* Preview */}
                <div className="glass rounded-xl p-3 flex items-center justify-center gap-4">
                  <div className="text-white/50 text-xs">Preview:</div>
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-4 rounded-t-full" style={{ background: SKIN_COLORS.find(c => c.hex === skinHat)?.css || '#d9534f' }} />
                    <div className="w-3 h-3 rounded-sm bg-[#ffcca6]" />
                    <div className="w-6 h-6 rounded-sm" style={{ background: BODY_COLORS.find(c => c.hex === skinBody)?.css || '#3d5a40' }} />
                    <div className="w-5 h-5 rounded-b-sm" style={{ background: PANTS_COLORS.find(c => c.hex === skinPants)?.css || '#2b2b2b' }} />
                    <div className="w-5 h-2 rounded-b bg-[#4a3525]" />
                  </div>
                </div>
              </>) : (<>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">✨ Graphics Quality</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { val: 'low' as const, label: 'Low', icon: '⚡' },
                      { val: 'medium' as const, label: 'Medium', icon: '✨' },
                      { val: 'high' as const, label: 'High', icon: '💎' },
                    ]).map(opt => (
                      <button key={opt.val} onClick={() => onUpdateConfig({ graphicsQuality: opt.val })}
                        className={`rounded-lg py-2 text-center text-xs transition-all cursor-pointer ${
                          config.graphicsQuality === opt.val ? 'bg-emerald-500/20 border border-emerald-400/30 text-white font-bold' : 'bg-white/5 text-white/40 hover:bg-white/8'}`}>
                        <div className="text-lg">{opt.icon}</div><div className="text-[10px]">{opt.label}</div></button>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-3">
                  <div className="text-white/70 text-xs font-bold mb-2">🎮 Controls</div>
                  <div className="space-y-1 text-[10px] text-white/40">
                    <div className="flex justify-between"><span className="text-white/60">WASD</span><span>Move</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Mouse</span><span>Look (click lock)</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Space</span><span>Action / Attack / PvP</span></div>
                    <div className="flex justify-between"><span className="text-white/60">1-4</span><span>Axe • Pick • Sword • Eat</span></div>
                  </div>
                  <div className="text-[9px] text-white/25 mt-2">📱 Mobile: Joystick + swipe right to look</div>
                </div>
              </>)}
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom">
              <div className="max-w-md mx-auto">
                <button onClick={handlePlay}
                  className="w-full py-3.5 rounded-2xl font-bold text-base transition-all active:scale-[0.97] cursor-pointer animate-pulse-glow"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(56,189,248,0.6))',
                    backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {mode === 'multiplayer' ? '🌐 Join World' : '🌲 Enter Mistfall'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TitleScreen;
