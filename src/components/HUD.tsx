import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameEngine, InventoryState } from '../game/GameEngine';
import type { ChatMessage } from '../game/Multiplayer';

interface Props {
  engine: GameEngine;
  health: number; hunger: number; stamina: number;
  timeOfDay: number; isNight: boolean; inventory: InventoryState;
  alertMsg: string; rainIntensity: number; isMultiplayer: boolean;
}

const StatBar = ({ icon, value, color }: { icon: string; value: number; color: string }) => (
  <div className="flex items-center gap-1">
    <span className="text-xs">{icon}</span>
    <div className="w-12 h-1.5 bg-black/40 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const HUD: React.FC<Props> = ({
  engine, health, hunger, stamina, timeOfDay, isNight, inventory, alertMsg, rainIntensity, isMultiplayer
}) => {
  const [craftOpen, setCraftOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  const timeLabel = timeOfDay < 0.22 ? 'Night' : timeOfDay < 0.35 ? 'Dawn' : timeOfDay < 0.65 ? 'Day' : timeOfDay < 0.78 ? 'Dusk' : 'Night';

  // Chat listener
  useEffect(() => {
    if (isMultiplayer) {
      engine.onChatReceived = (msg: ChatMessage) => {
        setChatMessages(prev => [...prev.slice(-30), msg]);
      };
    }
    return () => { engine.onChatReceived = null; };
  }, [engine, isMultiplayer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    engine.sendChat(chatInput.trim());
    setChatMessages(prev => [...prev.slice(-30), {
      id: engine.multiplayer.playerId,
      sender: engine.multiplayer.playerName,
      text: chatInput.trim(),
      timestamp: Date.now()
    }]);
    setChatInput('');
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchIdRef.current = e.touches[0].identifier;
    handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchIdRef.current) {
        handleJoystickMove(e.touches[i].clientX, e.touches[i].clientY); break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchIdRef.current = null;
    engine.moveVector.set(0, 0);
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
  }, [engine]);

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const maxD = rect.width / 2 - 10;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > maxD) { dx = (dx / d) * maxD; dy = (dy / d) * maxD; }
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    engine.moveVector.set(dx / maxD, -dy / maxD);
  };

  const recipes = [
    { id: 'workbench', icon: '🔨', label: 'Bench', cost: '4W', can: inventory.wood >= 4 && !inventory.workbench },
    { id: 'axe', icon: '🪓', label: 'Axe', cost: '3W 2S', can: inventory.workbench && inventory.wood >= 3 && inventory.stone >= 2 && !inventory.axe },
    { id: 'pickaxe', icon: '⛏️', label: 'Pick', cost: '2W 3S', can: inventory.workbench && inventory.wood >= 2 && inventory.stone >= 3 && !inventory.pickaxe },
    { id: 'sword', icon: '⚔️', label: 'Sword', cost: '2W 4S 1💎', can: inventory.workbench && inventory.wood >= 2 && inventory.stone >= 4 && inventory.crystal >= 1 && !inventory.sword },
    { id: 'campfire', icon: '🔥', label: 'Fire', cost: '5W 3S', can: inventory.wood >= 5 && inventory.stone >= 3 },
    { id: 'furnace', icon: '🧱', label: 'Furn', cost: '8S', can: inventory.workbench && inventory.stone >= 8 },
  ];

  const invItems = [
    { icon: '🪵', val: inventory.wood }, { icon: '🪨', val: inventory.stone },
    { icon: '🥩', val: inventory.rawMeat }, { icon: '🍖', val: inventory.cookedMeat },
    { icon: '🥕', val: inventory.carrot }, { icon: '🫐', val: inventory.berries },
    { icon: '🍄', val: inventory.mushroom }, { icon: '💎', val: inventory.crystal },
    { icon: '🪙', val: inventory.gold },
  ];

  const isMobile = 'ontouchstart' in window;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Alert message */}
      {alertMsg && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none animate-slide-down">
          <div className="glass rounded-xl px-3 py-1.5 text-white text-xs font-medium whitespace-nowrap max-w-[85vw] truncate">
            {alertMsg}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 safe-top pointer-events-auto">
        <div className="flex items-start justify-between px-2 pt-1.5 gap-2">
          {/* Left: Crafting + Chat */}
          <div className="flex gap-1.5">
            <button onClick={() => { setCraftOpen(!craftOpen); setChatOpen(false); }}
              className="glass rounded-xl w-9 h-9 flex items-center justify-center text-base active:scale-90 transition-transform cursor-pointer">
              ⚒️
            </button>
            {isMultiplayer && (
              <button onClick={() => { setChatOpen(!chatOpen); setCraftOpen(false); }}
                className="glass rounded-xl w-9 h-9 flex items-center justify-center text-base active:scale-90 transition-transform cursor-pointer">
                💬
              </button>
            )}
          </div>

          {/* Center: Stats */}
          <div className="glass rounded-xl px-2 py-1.5 flex gap-2">
            <StatBar icon="❤️" value={health} color="bg-gradient-to-r from-red-600 to-red-400" />
            <StatBar icon="🍖" value={hunger} color="bg-gradient-to-r from-orange-600 to-amber-400" />
            <StatBar icon="⚡" value={stamina} color="bg-gradient-to-r from-yellow-500 to-yellow-300" />
          </div>

          {/* Right: Time */}
          <div className="glass rounded-xl px-2 py-1.5 flex items-center gap-1 text-xs text-white/70">
            <span>{isNight ? '🌙' : '☀️'}</span>
            <span className="text-[10px]">{timeLabel}</span>
            {rainIntensity > 0.15 && <span>🌧️</span>}
          </div>
        </div>

        {/* Crafting panel */}
        {craftOpen && (
          <div className="mx-2 mt-1.5 glass rounded-xl p-3 animate-slide-down max-h-[50vh] overflow-y-auto no-scrollbar">
            <div className="text-white text-xs font-bold mb-2">⚒️ Inventory & Crafting</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {invItems.map((item, i) => (
                <div key={i} className="bg-white/5 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5 text-xs">
                  <span>{item.icon}</span>
                  <span className="text-white/70 font-mono text-[10px]">{item.val}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {recipes.map(r => (
                <button key={r.id} onClick={() => { engine.craft(r.id); }}
                  disabled={!r.can}
                  className={`rounded-lg py-1.5 px-1 text-center transition-all cursor-pointer ${
                    r.can ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-white border border-emerald-400/20'
                           : 'bg-white/3 text-white/20'
                  }`}>
                  <div className="text-lg leading-none">{r.icon}</div>
                  <div className="text-[8px] font-bold mt-0.5">{r.label}</div>
                  <div className="text-[7px] opacity-50">{r.cost}</div>
                </button>
              ))}
            </div>
            <div className="text-[8px] text-white/20 mt-2">Use campfire/furnace to cook meat</div>
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && isMultiplayer && (
          <div className="mx-2 mt-1.5 glass rounded-xl p-3 animate-slide-down max-h-[40vh] flex flex-col">
            <div className="text-white text-xs font-bold mb-2">💬 Chat</div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 mb-2 min-h-[60px] max-h-[120px]">
              {chatMessages.length === 0 && (
                <div className="text-white/20 text-[10px] text-center py-4">No messages yet</div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="text-[10px]">
                  <span className="text-emerald-300 font-bold">{msg.sender}: </span>
                  <span className="text-white/70">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-1.5">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                placeholder="Type..."
                className="flex-1 bg-white/5 rounded-lg px-2 py-1.5 text-white text-xs outline-none border border-white/10 focus:border-emerald-400/40 placeholder:text-white/20" />
              <button onClick={sendChat}
                className="bg-emerald-500/20 rounded-lg px-3 py-1.5 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer">
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Death screen */}
      {health <= 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="text-center glass rounded-2xl p-6 animate-fade-in-up">
            <div className="text-5xl mb-3">💀</div>
            <div className="text-white text-xl font-black mb-1">YOU HAVE FALLEN</div>
            <div className="text-white/40 text-xs mb-4">The mist claims another soul...</div>
            <button onClick={() => engine.respawn()}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.8), rgba(56,189,248,0.6))' }}>
              Respawn
            </button>
          </div>
        </div>
      )}

      {/* Placement buttons */}
      {(inventory.campfireCount > 0 || inventory.furnaceCount > 0) && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
          {inventory.campfireCount > 0 && (
            <button onClick={() => engine.placeStructure('campfire')}
              className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">
              🔥
            </button>
          )}
          {inventory.furnaceCount > 0 && (
            <button onClick={() => engine.placeStructure('furnace')}
              className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">
              🧱
            </button>
          )}
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 safe-bottom pointer-events-auto">
        <div className="flex items-end justify-between px-2 pb-2">
          {/* Desktop tools */}
          {!isMobile && (
            <div className="flex gap-1.5">
              {inventory.axe && (
                <button onClick={() => engine.equipTool('axe')}
                  className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">🪓</button>
              )}
              {inventory.pickaxe && (
                <button onClick={() => engine.equipTool('pickaxe')}
                  className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">⛏️</button>
              )}
              {inventory.sword && (
                <button onClick={() => engine.equipTool('sword')}
                  className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">⚔️</button>
              )}
              {inventory.cookedMeat > 0 && (
                <button onClick={() => engine.equipTool('meat')}
                  className="glass rounded-xl w-10 h-10 flex items-center justify-center text-lg active:scale-90 transition-transform cursor-pointer">🍖</button>
              )}
            </div>
          )}

          {/* Desktop hints */}
          {!isMobile && (
            <div className="glass rounded-xl px-3 py-1.5 text-[9px] text-white/30 text-center">
              🖱️ Click to look • WASD move • Space = Action • 1-4 = Tools
            </div>
          )}

          {/* Mobile joystick */}
          {isMobile && (
            <div ref={joystickRef}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              className="relative w-24 h-24 rounded-full border-2 border-white/15 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}>
              <div ref={joystickKnobRef}
                className="w-10 h-10 rounded-full bg-white/20 border border-white/30 transition-none" />
            </div>
          )}

          {/* Mobile action buttons */}
          {isMobile && (
            <div className="flex flex-col items-end gap-1.5">
              {/* Tool row */}
              <div className="flex gap-1">
                {inventory.axe && (
                  <button onClick={() => engine.equipTool('axe')}
                    className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm active:scale-90 cursor-pointer">🪓</button>
                )}
                {inventory.pickaxe && (
                  <button onClick={() => engine.equipTool('pickaxe')}
                    className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm active:scale-90 cursor-pointer">⛏️</button>
                )}
                {inventory.sword && (
                  <button onClick={() => engine.equipTool('sword')}
                    className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm active:scale-90 cursor-pointer">⚔️</button>
                )}
                {inventory.cookedMeat > 0 && (
                  <button onClick={() => engine.equipTool('meat')}
                    className="glass rounded-xl w-9 h-9 flex items-center justify-center text-sm active:scale-90 cursor-pointer">🍖</button>
                )}
              </div>
              {/* Action button */}
              <button onClick={() => engine.triggerAction()}
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white active:scale-90 transition-transform cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.6), rgba(56,189,248,0.4))',
                  backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.2)'
                }}>
                ⚡
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HUD;
