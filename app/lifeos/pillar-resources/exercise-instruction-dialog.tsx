"use client";

import { useEffect, useRef, useState } from "react";
import { exerciseInstruction, type CatalogExercise, type ExerciseVisual } from "@/lib/lifeos-exercises";

function Pose({ visual, finish }: { visual: ExerciseVisual; finish: boolean }) {
  const stroke = "#bae6fd";
  const accent = "#38bdf8";
  const common = { stroke, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  if (visual === "ROWER") return <g {...common}><line x1="35" y1="150" x2="220" y2="150" stroke="#475569" /><rect x={finish ? 120 : 72} y="132" width="28" height="8" rx="4" fill="#64748b" stroke="none" /><circle cx={finish ? 132 : 86} cy={finish ? 55 : 66} r="14" fill="none" /><line x1={finish ? 132 : 86} y1={finish ? 70 : 82} x2={finish ? 122 : 112} y2="112" /><line x1={finish ? 122 : 112} y1="112" x2={finish ? 86 : 135} y2="145" /><line x1={finish ? 86 : 135} y1="145" x2="55" y2="145" /><line x1={finish ? 128 : 100} y1="88" x2={finish ? 162 : 150} y2={finish ? 108 : 86} /><line x1={finish ? 162 : 150} y1={finish ? 108 : 86} x2="190" y2="96" /><line x1="190" y1="78" x2="190" y2="118" stroke={accent} /><path d={finish ? "M175 60 L205 60 M196 51 L205 60 L196 69" : "M150 45 L180 45 M171 36 L180 45 L171 54"} stroke={accent} /></g>;
  if (visual === "TREADMILL") return <g {...common}><rect x="35" y="148" width="190" height="13" rx="6" stroke="#475569" /><circle cx="130" cy="45" r="14" /><line x1="130" y1="60" x2="130" y2="108" /><line x1="130" y1="75" x2={finish ? 160 : 100} y2={finish ? 98 : 90} /><line x1="130" y1="108" x2={finish ? 165 : 105} y2="146" /><line x1="130" y1="108" x2={finish ? 104 : 160} y2="146" /><path d="M60 125 L100 125 M91 116 L100 125 L91 134" stroke={accent} /></g>;
  if (visual === "BIKE") return <g {...common}><circle cx="78" cy="140" r="34" stroke="#64748b" /><circle cx="184" cy="140" r="34" stroke="#64748b" /><line x1="78" y1="140" x2="130" y2="140" /><line x1="130" y1="140" x2="105" y2="95" /><line x1="105" y1="95" x2="162" y2="95" /><line x1="162" y1="95" x2="184" y2="140" /><circle cx="120" cy="48" r="14" /><line x1="120" y1="63" x2="105" y2="95" /><line x1="112" y1="78" x2="165" y2="82" /><line x1="105" y1="95" x2={finish ? 150 : 118} y2="140" /><line x1={finish ? 150 : 118} y1="140" x2={finish ? 184 : 78} y2="140" /><path d="M205 70 C225 85 225 105 205 120" stroke={accent} /></g>;
  if (visual === "CHEST_PRESS") return <g {...common}><line x1="45" y1="124" x2="205" y2="124" stroke="#64748b" /><line x1="70" y1="124" x2="60" y2="160" stroke="#64748b" /><line x1="180" y1="124" x2="190" y2="160" stroke="#64748b" /><circle cx="72" cy="104" r="14" /><line x1="88" y1="108" x2="155" y2="114" /><line x1="155" y1="114" x2="195" y2="150" /><line x1="130" y1="111" x2={finish ? 130 : 112} y2={finish ? 48 : 78} /><line x1={finish ? 130 : 112} y1={finish ? 48 : 78} x2={finish ? 130 : 138} y2={finish ? 28 : 60} /><line x1="92" y1={finish ? 30 : 60} x2="170" y2={finish ? 30 : 60} stroke={accent} /></g>;
  if (visual === "GLUTE_BRIDGE") return <g {...common}><line x1="35" y1="155" x2="225" y2="155" stroke="#475569" /><circle cx="60" cy={finish ? 117 : 137} r="13" /><line x1="75" y1={finish ? 120 : 140} x2="125" y2={finish ? 95 : 140} /><line x1="125" y1={finish ? 95 : 140} x2="165" y2="150" /><line x1="165" y1="150" x2="205" y2="150" /><path d="M125 128 L125 82 M116 91 L125 82 L134 91" stroke={accent} /></g>;

  const isLower = ["SQUAT", "HINGE", "LUNGE", "CALF"].includes(visual);
  if (isLower) {
    const headX = visual === "HINGE" && finish ? 165 : 130;
    const headY = visual === "SQUAT" && finish ? 80 : visual === "HINGE" && finish ? 72 : visual === "LUNGE" && finish ? 72 : finish && visual === "CALF" ? 35 : 45;
    const hipX = visual === "HINGE" && finish ? 118 : 130;
    const hipY = visual === "SQUAT" && finish ? 126 : visual === "LUNGE" && finish ? 112 : 105;
    return <g {...common}><circle cx={headX} cy={headY} r="14" /><line x1={headX} y1={headY + 15} x2={hipX} y2={hipY} /><line x1={headX - 2} y1={headY + 34} x2={visual === "HINGE" && finish ? 188 : 105} y2={visual === "HINGE" && finish ? 112 : 100} /><line x1={headX - 2} y1={headY + 34} x2={visual === "HINGE" && finish ? 185 : 155} y2={visual === "HINGE" && finish ? 123 : 100} /><line x1={hipX} y1={hipY} x2={visual === "LUNGE" && finish ? 92 : visual === "SQUAT" && finish ? 95 : 115} y2={visual === "SQUAT" && finish ? 145 : 140} /><line x1={visual === "LUNGE" && finish ? 92 : visual === "SQUAT" && finish ? 95 : 115} y1={visual === "SQUAT" && finish ? 145 : 140} x2={visual === "LUNGE" && finish ? 55 : 102} y2={finish && visual === "CALF" ? 166 : 170} /><line x1={hipX} y1={hipY} x2={visual === "LUNGE" && finish ? 172 : visual === "SQUAT" && finish ? 165 : 145} y2={visual === "SQUAT" && finish ? 145 : 140} /><line x1={visual === "LUNGE" && finish ? 172 : visual === "SQUAT" && finish ? 165 : 145} y1={visual === "SQUAT" && finish ? 145 : 140} x2={visual === "LUNGE" && finish ? 210 : 158} y2={finish && visual === "CALF" ? 166 : 170} /><path d={visual === "HINGE" ? "M205 70 L225 95 M215 90 L225 95 L222 84" : "M215 75 L215 125 M206 116 L215 125 L224 116"} stroke={accent} /></g>;
  }

  const overhead = visual === "OVERHEAD";
  const pulldown = visual === "PULLDOWN";
  const row = visual === "ROW";
  const armY = finish ? (overhead ? 38 : pulldown ? 92 : row ? 102 : 78) : (overhead || pulldown ? 88 : row ? 76 : 108);
  return <g {...common}><circle cx="130" cy="45" r="14" /><line x1="130" y1="60" x2="130" y2="120" /><line x1="130" y1="120" x2="105" y2="170" /><line x1="130" y1="120" x2="155" y2="170" /><line x1="128" y1="78" x2="98" y2={armY} /><line x1="132" y1="78" x2="162" y2={armY} /><line x1="98" y1={armY} x2="80" y2={overhead && finish ? 24 : pulldown && !finish ? 25 : row && finish ? 105 : armY + 18} /><line x1="162" y1={armY} x2="180" y2={overhead && finish ? 24 : pulldown && !finish ? 25 : row && finish ? 105 : armY + 18} /><path d={overhead ? "M205 105 L205 55 M196 64 L205 55 L214 64" : pulldown ? "M205 45 L205 95 M196 86 L205 95 L214 86" : "M205 80 L175 80 M184 71 L175 80 L184 89"} stroke={accent} /></g>;
}

function MovementIllustration({ visual, playing, phase }: { visual: ExerciseVisual; playing: boolean; phase: boolean }) {
  return <svg viewBox="0 0 600 220" role="img" aria-label={playing ? `Movement demo showing the ${phase ? "finish" : "start"} position` : "Illustrated start and finish positions"} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950">
    <rect x="12" y="12" width="276" height="196" rx="14" fill="#07101f" stroke="#334155" />
    <rect x="312" y="12" width="276" height="196" rx="14" fill="#07101f" stroke="#334155" />
    <text x="30" y="40" fill="#94a3b8" fontSize="13" fontWeight="700" letterSpacing="2">START</text>
    <text x="330" y="40" fill="#38bdf8" fontSize="13" fontWeight="700" letterSpacing="2">FINISH</text>
    <g transform="translate(12 18)" opacity={playing && phase ? 0.22 : 1} style={{ transition: "opacity 300ms ease" }}><Pose visual={visual} finish={false} /></g>
    <g transform="translate(312 18)" opacity={playing && !phase ? 0.22 : 1} style={{ transition: "opacity 300ms ease" }}><Pose visual={visual} finish /></g>
    {playing && <text x="300" y="205" textAnchor="middle" fill="#7dd3fc" fontSize="13" fontWeight="700">{phase ? "FINISH — return with control" : "START — set your position"}</text>}
  </svg>;
}

export default function ExerciseInstructionDialog({ exercise, onClose, onPlan, returnLabel, showPlanAction }: { exercise: CatalogExercise; onClose: () => void; onPlan: (exercise: CatalogExercise) => void; returnLabel: string; showPlanAction: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(false);
  const instruction = exerciseInstruction(exercise);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  useEffect(() => {
    if (!playing) { setPhase(false); return; }
    const interval = window.setInterval(() => setPhase((value) => !value), 900);
    return () => window.clearInterval(interval);
  }, [playing]);

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="exercise-guide-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-sky-700 bg-slate-900 p-4 shadow-2xl shadow-black/60 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.15em] text-sky-300">{exercise.category === "UPPER" ? "Upper body" : exercise.category === "LOWER" ? "Lower body" : "Cardio"} · {exercise.equipment}</p><h3 id="exercise-guide-title" className="mt-1 text-2xl font-semibold text-slate-50">{exercise.name}</h3><p className="mt-1 text-base text-slate-400">{exercise.muscleGroup} · {exercise.pattern}</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close exercise guide" className="min-h-11 min-w-11 rounded-lg border border-slate-600 text-xl text-slate-200 hover:bg-slate-800">×</button></div>

      <MovementIllustration visual={instruction.visual} playing={playing} phase={phase} />
      <button type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)} className="mt-3 min-h-11 w-full rounded-lg border border-sky-700 bg-sky-950/30 px-4 text-sm font-semibold text-sky-200 hover:bg-sky-950/60">{playing ? "Pause movement demo" : "Play movement demo"}</button>

      <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><h4 className="text-base font-semibold text-slate-100">Set up</h4><p className="mt-2 text-base leading-6 text-slate-300">{instruction.setup}</p></div><div className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4"><h4 className="text-base font-semibold text-amber-200">Watch for</h4><p className="mt-2 text-base leading-6 text-slate-300">{instruction.watchFor}</p></div></div>
      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-4"><h4 className="text-base font-semibold text-slate-100">How to do it</h4><ol className="mt-3 space-y-3">{instruction.steps.map((step, index) => <li key={step} className="flex gap-3 text-base leading-6 text-slate-300"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400 font-semibold text-slate-950">{index + 1}</span><span>{step}</span></li>)}</ol></div>
      <p className="mt-4 text-sm leading-5 text-slate-500">The illustration is a positioning guide, not a substitute for in-person coaching. Start light, use the machine safety stops where applicable, and stop if a movement causes pain, dizziness, or unusual symptoms.</p>

      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">{returnLabel}</button>{showPlanAction && <button type="button" onClick={() => { onPlan(exercise); onClose(); }} className="min-h-11 rounded-lg bg-sky-400 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-300">Add to weekly plan</button>}</div>
    </section>
  </div>;
}
