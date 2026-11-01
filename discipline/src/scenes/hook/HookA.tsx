import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ReachArm } from '../../characters/Arm';
import { Bean } from '../../characters/Bean';
import { POSES } from '../../characters/poses';
import { v2 } from '../../characters/rig';
import { StaticDay } from '../../components/DayLabel';
import { Stage, camTransform, type Cam, type Viewport } from '../../components/Stage';
import { FlashCard, KineticText } from '../../components/Text';
import { COPY } from '../../config/copy';
import { COLORS, PALETTES, TEXT } from '../../config/theme';
import { SpeedLines } from '../../fx/Atmos';
import { BOIL } from '../../fx/GlobalDefs';
import { EASE, hash, keys, kick, lerp, prog } from '../../lib/anim';
import { useFormat, useSvgId } from '../../lib/format';
import { Bedroom, ROOM, clockLight } from '../../props/Bedroom';
import { HOOK, HOOK_WORDS } from '../../timing';

const NIGHT = PALETTES.night;
const DAWN = PALETTES.sunrise;

/** Slam-zoom a camera into a world point: keeps the zoom exponential, recenters as it goes. */
export const slamTo = (from: Cam, target: { x: number; y: number }, zoom: number, t: number): Cam => {
  if (t <= 0) return from;
  const z = Math.exp(lerp(Math.log(from.zoom), Math.log(zoom), t));
  const k = (from.zoom / z) * (1 - t);
  return { x: target.x + (from.x - target.x) * k, y: target.y + (from.y - target.y) * k, zoom: z, rot: lerp(from.rot ?? 0, 0, t) };
};

/** DAY 1 — dark room, buried under the blanket, slapping snooze. */
export const Day1Room: React.FC<{ f: number; heartbeat?: number }> = ({ f, heartbeat = 0 }) => {
  const slap = HOOK.slap;
  const hand = v2(
    keys(f, [
      [5, -192],
      [16, -292, EASE.out],
      [slap, -318, EASE.inStrong],
      [32, -316],
      [44, -214, EASE.inOut],
    ]),
    keys(f, [
      [5, -186],
      [16, -300, EASE.out],
      [slap, -232, EASE.inStrong],
      [32, -230],
      [44, -190, EASE.inOut],
    ]),
  );
  const armOn = f >= 5 && f < 45;
  const squash = kick(f, slap, 3);
  return (
    <Bedroom
      palette={NIGHT}
      sky="night"
      frame={f}
      blanket="buried"
      shoes="dusty"
      clock={{
        time: '5:00',
        ring: f < slap ? 1 : 0,
        squash,
        on: !(f >= slap && f < slap + 2),
        glow: 1.3 + 0.5 * kick(f, slap, 5) + heartbeat,
        spill: 360,
      }}
      occupant={
        <Bean
          x={ROOM.lying.x}
          y={ROOM.lying.y}
          pose={POSES.lieBack}
          eyebrowMood="tired"
          lid={0.12 + 0.2 * kick(f, slap, 6)}
          turn={-0.55}
          look={{ x: -0.4, y: -0.1 }}
          blink={f > 52 && f < 56 ? 1 : 0}
          ambient={{ color: NIGHT.ambient, amount: NIGHT.ambientAmount }}
          light={clockLight(0.8, 340)}
        />
      }
      over={
        armOn ? (
          <ReachArm
            from={v2(-176, -186)}
            to={hand}
            bend={-1}
            ambient={{ color: '#FF6A55', amount: 0.18 }}
          />
        ) : null
      }
    />
  );
};

/** DAY 365 — same room, empty bed, sunrise flooding, him outside running uphill. */
export const Day365Room: React.FC<{ f: number }> = ({ f }) => (
  <Bedroom
    palette={DAWN}
    sky="sunrise"
    frame={f}
    flood={1}
    blanket="made"
    shoes="none"
    runner
    clock={{ time: '5:00', glow: 0.55, spill: 200 }}
  />
);

const SHARDS = (() => {
  // radial fracture of the right/bottom half from the impact point (normalized 0..1 space)
  const n = 6;
  const out: Array<{ a0: number; a1: number; r: number; inner: boolean; seed: number }> = [];
  for (let i = 0; i < n; i++) {
    const a0 = -90 + (180 * i) / n + (i === 0 ? 0 : (hash(i * 3.3) - 0.5) * 14);
    const a1 = -90 + (180 * (i + 1)) / n + (i === n - 1 ? 0 : (hash((i + 1) * 3.3) - 0.5) * 14);
    const r = 0.22 + 0.25 * hash(i * 7.1);
    out.push({ a0, a1, r, inner: true, seed: i * 2 });
    out.push({ a0, a1, r, inner: false, seed: i * 2 + 1 });
  }
  return out;
})();

/** Divider crack + shatter + left side swallowing the screen + slam into 5:00. */
export const HookA: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H, portrait, orientation } = useFormat();
  const shardsId = useSvgId('shard');
  const I = HOOK.impact;

  const expand = prog(f, I, I + 8, EASE.out);
  const leftVp: Viewport = portrait ? { x: 0, y: 0, w: W, h: H / 2 + (H / 2) * expand } : { x: 0, y: 0, w: W / 2 + (W / 2) * expand, h: H };
  const rightVp: Viewport = portrait ? { x: 0, y: H / 2, w: W, h: H / 2 } : { x: W / 2, y: 0, w: W / 2, h: H };

  const push = prog(f, 0, I, EASE.soft);
  const baseLeft: Cam = portrait
    ? { x: -150 - 30 * push, y: -150 + 14 * push, zoom: 1.62 * (1 + 0.08 * push), rot: -1.5 * push }
    : { x: -150 - 24 * push, y: -228 + 10 * push, zoom: 1.66 * (1 + 0.08 * push), rot: -1.5 * push };
  const slamT = prog(f, I + 1, HOOK.slamEnd, EASE.slam);
  let leftCam = slamTo(baseLeft, ROOM.clockFace, portrait ? 9.6 : 13.5, slamT);
  if (f >= HOOK.slamEnd) {
    const settle = 1 + 0.035 * Math.sin((f - HOOK.slamEnd) * 0.9) * Math.exp(-(f - HOOK.slamEnd) / 5);
    const creep = 1 + 0.07 * prog(f, HOOK.slamEnd, HOOK.end, EASE.soft) + 0.03 * kick(f, HOOK.heartbeat, 4);
    leftCam = { ...leftCam, zoom: leftCam.zoom * settle * creep };
  }
  const rightCam: Cam = portrait
    ? { x: 40, y: -470 - 30 * push, zoom: 1.5 * (1 + 0.06 * push) }
    : { x: 30, y: -430 - 40 * push, zoom: 1.5 * (1 + 0.06 * push), rot: 1 * push };

  const heartbeat = f >= HOOK.silence ? 0.9 * kick(f, HOOK.heartbeat, 5) + 0.6 * kick(f, HOOK.heartbeat + 6, 5) - 0.35 : 0;

  // ── divider & crack ──
  const crackT = prog(f, HOOK.crack, I, EASE.in);
  const N = 18;
  const along = portrait ? W : H;
  const crackPts: Array<[number, number]> = [];
  for (let k = 0; k <= N; k++) {
    const u = k / N;
    const off = (hash(k * 5.7) - 0.5) * 26 * (k % 2 === 0 ? 1 : -1);
    crackPts.push(portrait ? [u * along, H / 2 + off] : [W / 2 + off, u * along]);
  }
  const reveal = (pt: [number, number]) => {
    const u = portrait ? pt[0] / along : pt[1] / along;
    return Math.abs(u - 0.5) <= crackT * 0.5 + 0.001;
  };
  const crackPath = crackPts.filter(reveal).map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join('');

  // ── shards ──
  const shardT = f - I;
  const showShards = f >= I && f < I + 18;
  const hx = portrait ? W / 2 : W / 2;
  const hy = portrait ? H / 2 : H / 2;
  const R = Math.hypot(W, H);
  const shardPoly = (s: (typeof SHARDS)[number]) => {
    const toXY = (a: number, r: number) => {
      const rad = (a * Math.PI) / 180;
      // landscape: fan opens to +x ; portrait: fan opens to +y
      const dx = Math.cos(rad) * r;
      const dy = Math.sin(rad) * r;
      return portrait ? [hx - dy, hy + dx] : [hx + dx, hy + dy];
    };
    const r1 = s.r * (portrait ? H : W);
    const pts = s.inner
      ? [[hx, hy], toXY(s.a0, r1), toXY((s.a0 + s.a1) / 2, r1 * 1.08), toXY(s.a1, r1)]
      : [toXY(s.a0, r1), toXY(s.a0, R), toXY(s.a1, R), toXY(s.a1, r1), toXY((s.a0 + s.a1) / 2, r1 * 1.08)];
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return { pts, cx, cy };
  };

  const textSize = TEXT.hook[orientation];
  const words = COPY.hook.A[orientation];

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      {/* RIGHT: DAY 365 (until it shatters) */}
      {f < I ? (
        <Stage cam={rightCam} viewport={rightVp} bg={DAWN.wall} seed="hookR">
          <Day365Room f={f} />
        </Stage>
      ) : null}

      {/* LEFT: DAY 1 — swallows the screen */}
      <Stage cam={leftCam} viewport={leftVp} bg={NIGHT.wall} seed="hookL" handheld={f >= HOOK.slamEnd ? 0.4 : 1}>
        <Day1Room f={f} heartbeat={Math.max(0, heartbeat)} />
      </Stage>

      {/* shards of DAY 365 flying away */}
      {showShards ? (
        <svg className="stage" width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            {SHARDS.map((s, i) => (
              <clipPath key={i} id={`${shardsId}-${i}`}>
                <polygon points={shardPoly(s).pts.map((p) => p.join(',')).join(' ')} />
              </clipPath>
            ))}
            <clipPath id={`${shardsId}-half`}>
              <rect x={rightVp.x} y={rightVp.y} width={rightVp.w} height={rightVp.h} />
            </clipPath>
          </defs>
          <g filter={BOIL}>
            {SHARDS.map((s, i) => {
              const { pts, cx, cy } = shardPoly(s);
              const dirx = cx - hx;
              const diry = cy - hy;
              const L = Math.hypot(dirx, diry) || 1;
              const sp = 16 + 26 * hash(s.seed * 1.9);
              const t = shardT;
              const ox = (dirx / L) * sp * t + (portrait ? 0 : 0);
              const oy = (diry / L) * sp * t + 1.6 * t * t;
              const rot = (hash(s.seed * 4.2) - 0.5) * 9 * t;
              const op = 1 - prog(f, I + 9, I + 18, EASE.in);
              return (
                <g key={i} transform={`translate(${ox} ${oy}) rotate(${rot} ${cx} ${cy})`} opacity={op}>
                  <g clipPath={`url(#${shardsId}-half)`}>
                    <g clipPath={`url(#${shardsId}-${i})`}>
                      <rect x={rightVp.x - 40} y={rightVp.y - 40} width={rightVp.w + 80} height={rightVp.h + 80} fill={DAWN.wall} />
                      <g transform={camTransform(rightCam, rightVp)}>
                        <Day365Room f={f} />
                      </g>
                    </g>
                  </g>
                  <polygon
                    points={pts.map((p) => p.join(',')).join(' ')}
                    fill="none"
                    stroke="#FFF6E6"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    clipPath={`url(#${shardsId}-half)`}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      ) : null}

      {/* divider + crack */}
      {f < I ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {portrait ? (
            <rect x={0} y={H / 2 - 3} width={W} height={6} fill="#F4F0E6" />
          ) : (
            <rect x={W / 2 - 3} y={0} width={6} height={H} fill="#F4F0E6" />
          )}
          {crackT > 0 ? (
            <g stroke="#FFFFFF" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={crackPath} strokeWidth={10} strokeOpacity={0.35} />
              <path d={crackPath} strokeWidth={4} />
              {crackPts.filter(reveal).filter((_, i) => i % 3 === 1).map((p, i) => {
                const len = 30 + 40 * hash(i * 9.9);
                const ang = (hash(i * 2.2) - 0.5) * 2.4 + (portrait ? Math.PI / 2 : 0);
                return (
                  <path key={i} d={`M${p[0]} ${p[1]} l${Math.cos(ang) * len} ${Math.sin(ang) * len}`} strokeWidth={2.5} />
                );
              })}
            </g>
          ) : null}
        </svg>
      ) : null}

      {/* glass dust + slam lines */}
      {f >= I && f < I + 16 ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 34 }, (_, i) => {
            const a = hash(i * 1.37) * Math.PI * 2;
            const sp = 20 + 50 * hash(i * 4.1);
            const t = f - I;
            const x = W / 2 + Math.cos(a) * sp * t;
            const y = H / 2 + Math.sin(a) * sp * t + 1.2 * t * t;
            const s = 4 + 9 * hash(i * 8.8);
            return (
              <polygon
                key={i}
                points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.6} ${x - s * 0.7},${y + s * 0.5}`}
                fill="#FFF8EC"
                opacity={1 - t / 16}
              />
            );
          })}
          <SpeedLines cx={W / 2} cy={H / 2} amount={prog(f, I, I + 3) * (1 - prog(f, I + 6, I + 15))} />
        </svg>
      ) : null}

      {/* impact flash */}
      {f >= I && f < I + 3 ? <AbsoluteFill style={{ background: '#FFF4E8', opacity: [0.16, 0.3, 0.1][f - I] }} /> : null}

      {/* chapter labels inside the split */}
      {f < HOOK.silence ? (
        <StaticDay day={1} x={portrait ? 56 : 48} y={portrait ? 150 : 40} size={TEXT.day[orientation]} />
      ) : null}
      {f < I ? (
        <StaticDay day={365} x={portrait ? 56 : W / 2 + 48} y={portrait ? H / 2 + 36 : 40} size={TEXT.day[orientation]} />
      ) : null}

      {/* dead silence: crush everything but the clock */}
      {f >= HOOK.silence + HOOK.flashDur ? (
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.75) 85%)' }} />
      ) : null}

      <KineticText
        text={words}
        at={HOOK_WORDS.A}
        size={textSize}
        emphasis={COPY.hook.A.emphasis}
        y={portrait ? 0.5 : 0.74}
        hideFrom={HOOK.silence}
      />
      {f >= HOOK.flash && f < HOOK.flash + HOOK.flashDur ? <FlashCard text={COPY.flash[orientation]} size={TEXT.flash[orientation]} /> : null}
    </AbsoluteFill>
  );
};
