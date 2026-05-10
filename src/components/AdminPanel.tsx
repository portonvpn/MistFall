import { useState } from 'react';
import type { GameEngine } from '../game/GameEngine';

interface Props {
  engine: GameEngine;
  onClose: () => void;
  onAlert: (msg: string) => void;
}

const ADMIN_PASSWORD = 'cem';

const AdminPanel: React.FC<Props> = ({ engine, onClose, onAlert }) => {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [giveItem, setGiveItem] = useState('wood');
  const [giveAmount, setGiveAmount] = useState(50);

  const tryAuth = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); onAlert('🔓 Admin access granted'); }
    else onAlert('❌ Wrong password');
  };

  const give = () => {
    const inv = engine.inventory;
    const key = giveItem as keyof typeof inv;
    if (typeof inv[key] === 'number') {
      (inv as any)[key] += giveAmount;
      onAlert(`✅ Gave ${giveAmount}x ${giveItem}`);
    } else if (typeof inv[key] === 'boolean') {
      (inv as any)[key] = true;
      onAlert(`✅ Unlocked ${giveItem}`);
    }
  };

  const godMode = () => {
    engine.health = 100; engine.hunger = 100; engine.stamina = 100;
    onAlert('💛 God mode — full stats');
  };

  const giveAll = () => {
    const inv = engine.inventory;
    inv.wood = 999; inv.stone = 999; inv.crystal = 99; inv.gold = 999;
    inv.rawMeat = 50; inv.cookedMeat = 50; inv.carrot = 50; inv.berries = 50;
    inv.mushroom = 50; inv.axe = true; inv.pickaxe = true; inv.sword = true;
    inv.workbench = true; inv.campfireCount = 10; inv.furnaceCount = 10;
    engine.health = 100; engine.hunger = 100; engine.stamina = 100;
    onAlert('🎁 All items given + full stats');
  };

  const resetServer = async () => {
    if (!engine.multiplayer.connected) { onAlert('❌ Not connected to MP'); return; }
    await engine.multiplayer.resetServer();
    onAlert('🗑️ Server reset! All data wiped.');
  };

  const kickAll = async () => {
    if (!engine.multiplayer.connected) { onAlert('❌ Not connected to MP'); return; }
    const peers = engine.multiplayer.getPeerList();
    for (const p of peers) await engine.multiplayer.kickPlayer(p.id);
    onAlert(`👢 Kicked ${peers.length} player(s)`);
  };

  const setTime = (t: number) => {
    engine.timeOfDay = t;
    if (engine.multiplayer.connected) engine.multiplayer.sendTimeSync(t);
    onAlert(`🕐 Time set to ${t < 0.22 || t > 0.78 ? 'Night' : t < 0.35 ? 'Dawn' : t > 0.65 ? 'Dusk' : 'Day'}`);
  };

  const items = [
    'wood', 'stone', 'crystal', 'gold', 'rawMeat', 'cookedMeat',
    'carrot', 'berries', 'mushroom', 'axe', 'pickaxe', 'sword',
    'workbench', 'campfireCount', 'furnaceCount'
  ];

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="glass rounded-2xl p-5 w-72 animate-fade-in-up">
          <div className="text-white font-bold text-sm mb-3 text-center">🔒 Admin Access</div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') tryAuth(); }}
            placeholder="Password..."
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-emerald-400/40 mb-3 placeholder:text-white/20" autoFocus />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg glass text-white/50 text-xs cursor-pointer hover:bg-white/10">Cancel</button>
            <button onClick={tryAuth} className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/30">Login</button>
          </div>
        </div>
      </div>
    );
  }

  const peerList = engine.multiplayer.connected ? engine.multiplayer.getPeerList() : [];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass rounded-2xl p-4 w-80 max-h-[85vh] overflow-y-auto no-scrollbar animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-white font-bold text-sm">⚡ Admin Panel</div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg cursor-pointer">✕</button>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 mb-3">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Quick Actions</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={godMode} className="py-2 rounded-lg bg-yellow-500/15 text-yellow-300 text-xs font-bold cursor-pointer hover:bg-yellow-500/25 border border-yellow-400/20">💛 God Mode</button>
            <button onClick={giveAll} className="py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/25 border border-emerald-400/20">🎁 Give All</button>
          </div>
        </div>

        {/* Give Item */}
        <div className="space-y-2 mb-3">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Give Item</div>
          <div className="flex gap-1.5">
            <select value={giveItem} onChange={e => setGiveItem(e.target.value)}
              className="flex-1 bg-white/5 rounded-lg px-2 py-1.5 text-white text-xs outline-none border border-white/10">
              {items.map(i => <option key={i} value={i} className="bg-black">{i}</option>)}
            </select>
            <input type="number" value={giveAmount} onChange={e => setGiveAmount(parseInt(e.target.value) || 1)} min={1} max={9999}
              className="w-16 bg-white/5 rounded-lg px-2 py-1.5 text-white text-xs outline-none border border-white/10 text-center" />
            <button onClick={give} className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-bold cursor-pointer hover:bg-blue-500/25 border border-blue-400/20">Give</button>
          </div>
        </div>

        {/* Time Control */}
        <div className="space-y-2 mb-3">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Time Control</div>
          <div className="grid grid-cols-4 gap-1">
            <button onClick={() => setTime(0.1)} className="py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] cursor-pointer hover:bg-indigo-500/25">🌙Night</button>
            <button onClick={() => setTime(0.28)} className="py-1.5 rounded-lg bg-orange-500/15 text-orange-300 text-[10px] cursor-pointer hover:bg-orange-500/25">🌅Dawn</button>
            <button onClick={() => setTime(0.5)} className="py-1.5 rounded-lg bg-yellow-500/15 text-yellow-300 text-[10px] cursor-pointer hover:bg-yellow-500/25">☀️Day</button>
            <button onClick={() => setTime(0.7)} className="py-1.5 rounded-lg bg-red-500/15 text-red-300 text-[10px] cursor-pointer hover:bg-red-500/25">🌇Dusk</button>
          </div>
        </div>

        {/* Teleport */}
        <div className="space-y-2 mb-3">
          <div className="text-white/50 text-[10px] uppercase tracking-wider">Teleport</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => { engine.playerPos.set(0, engine.playerPos.y, 0); onAlert('📍 Teleported to spawn'); }}
              className="py-1.5 rounded-lg bg-white/5 text-white/60 text-[10px] cursor-pointer hover:bg-white/10">🏠 Spawn</button>
            <button onClick={() => { engine.playerPos.set(50, engine.playerPos.y, 50); onAlert('📍 Teleported to east'); }}
              className="py-1.5 rounded-lg bg-white/5 text-white/60 text-[10px] cursor-pointer hover:bg-white/10">🧭 East Forest</button>
          </div>
        </div>

        {/* Server Management */}
        {engine.multiplayer.connected && (
          <div className="space-y-2 mb-3">
            <div className="text-white/50 text-[10px] uppercase tracking-wider">Server ({peerList.length} online)</div>
            {peerList.length > 0 && (
              <div className="bg-white/3 rounded-lg p-2 space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                {peerList.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-[10px]">
                    <span className="text-white/60">{p.name}</span>
                    <button onClick={async () => { await engine.multiplayer.kickPlayer(p.id); onAlert(`👢 Kicked ${p.name}`); }}
                      className="text-red-400 hover:text-red-300 cursor-pointer">Kick</button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={kickAll} className="py-1.5 rounded-lg bg-red-500/15 text-red-300 text-[10px] cursor-pointer hover:bg-red-500/25">👢 Kick All</button>
              <button onClick={resetServer} className="py-1.5 rounded-lg bg-red-600/20 text-red-400 text-[10px] cursor-pointer hover:bg-red-600/30 font-bold">🗑️ Reset Server</button>
            </div>
          </div>
        )}

        <div className="text-white/15 text-[8px] text-center mt-2">Admin Panel v1.0 · Mistfall</div>
      </div>
    </div>
  );
};

export default AdminPanel;
