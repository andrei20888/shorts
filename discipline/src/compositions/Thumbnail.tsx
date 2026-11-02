import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Stage, type Viewport } from '../components/Stage';
import { StrokeText } from '../components/Text';
import { PALETTES, SUNRISE } from '../config/theme';
import { GlobalDefs } from '../fx/GlobalDefs';
import { Grain } from '../fx/Grain';
import { Vignette } from '../fx/Vignette';
import { useFormat } from '../lib/format';
import { ROOM } from '../props/Bedroom';
import { Day1Room } from '../scenes/hook/HookA';
import { SummitWorld } from '../scenes/Finale';

/** "DAY 1 vs DAY 365" — the hook's promise as a thumbnail (16:9 and 9:16). */
export const Thumbnail: React.FC = () => {
  const { width: W, height: H, portrait } = useFormat();
  const a: Viewport = portrait ? { x: 0, y: 0, w: W, h: H / 2 } : { x: 0, y: 0, w: W / 2, h: H };
  const b: Viewport = portrait ? { x: 0, y: H / 2, w: W, h: H / 2 } : { x: W / 2, y: 0, w: W / 2, h: H };
  const size = portrait ? 150 : 168;
  const label = (text: string, vp: Viewport, color: string) => (
    <div
      style={{
        position: 'absolute',
        left: vp.x,
        width: vp.w,
        top: vp.y + (portrait ? (vp.y === 0 ? 150 : 60) : 70),
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <StrokeText size={size} color={color} strokeRatio={0.22}>
        {text}
      </StrokeText>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <GlobalDefs />
      <Stage cam={{ x: ROOM.clockFace.x + 95, y: ROOM.clockFace.y + 10, zoom: portrait ? 4.2 : 3.6 }} viewport={a} bg={PALETTES.night.wall} handheld={0} seed="thA">
        <Day1Room f={8} />
      </Stage>
      <Stage cam={{ x: 0, y: -600, zoom: portrait ? 2.1 : 2.0 }} viewport={b} bg={SUNRISE.mid} handheld={0} seed="thB">
        <SummitWorld f={40} arms={1} />
      </Stage>
      {/* the crack between the two lives */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
        {portrait ? (
          <path d={`M0 ${H / 2} L${W * 0.3} ${H / 2 - 14} L${W * 0.45} ${H / 2 + 12} L${W * 0.62} ${H / 2 - 10} L${W * 0.8} ${H / 2 + 14} L${W} ${H / 2}`} stroke="#FFFFFF" strokeWidth={10} fill="none" strokeLinejoin="round" />
        ) : (
          <path d={`M${W / 2} 0 L${W / 2 - 14} ${H * 0.28} L${W / 2 + 12} ${H * 0.45} L${W / 2 - 10} ${H * 0.62} L${W / 2 + 14} ${H * 0.8} L${W / 2} ${H}`} stroke="#FFFFFF" strokeWidth={10} fill="none" strokeLinejoin="round" />
        )}
      </svg>
      {label('DAY 1', a, '#FFFFFF')}
      {label('DAY 365', b, '#FFE08A')}
      <Vignette strength={0.45} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
