'use client';

import { useEffect, useRef } from 'react';

export default function CrashCanvas({ multiplier, status }) {
  const canvasRef = useRef(null);

  const isCrashed = status === 'CRASHED';
  const isBetting = status === 'BETTING';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < rect.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = 0; y < rect.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
    };

    const drawCurve = () => {
      if (isBetting || multiplier <= 1) return;

      const margin = 60;
      const graphWidth = rect.width - margin * 2;
      const graphHeight = rect.height - margin * 2;
      const originX = margin;
      const originY = rect.height - margin;

      // Consistent progress calculation
      const xProgress = Math.min(1, (multiplier - 1) / 5); 
      const yProgress = Math.min(1, Math.log10(multiplier) / Math.log10(100));

      // Formula for the curve's Y value at any point 't' (0 to 1)
      const getCurveY = (t) => {
        const exponentialBase = (Math.pow(1.5, t * 10) - 1) / (Math.pow(1.5, 10) - 1);
        return originY - (graphHeight * exponentialBase * yProgress);
      };

      const endX = originX + graphWidth * xProgress;
      const endY = getCurveY(xProgress);

      // 1. Draw Gradient Fill
      const gradient = ctx.createLinearGradient(0, endY, 0, originY);
      gradient.addColorStop(0, isCrashed ? 'rgba(244, 63, 94, 0.2)' : 'rgba(147, 51, 234, 0.2)');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * xProgress;
        ctx.lineTo(originX + graphWidth * t, getCurveY(t));
      }
      ctx.lineTo(endX, originY);
      ctx.closePath();
      ctx.fill();

      // 2. Draw the Main Line
      ctx.strokeStyle = isCrashed ? '#f43f5e' : '#9333ea';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = isCrashed ? 'rgba(244, 63, 94, 0.8)' : 'rgba(147, 51, 234, 0.8)';

      ctx.beginPath();
      ctx.moveTo(originX, originY);
      for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * xProgress;
        ctx.lineTo(originX + graphWidth * t, getCurveY(t));
      }
      ctx.stroke();

      // 3. Draw Rocket Dot
      ctx.shadowBlur = 25;
      ctx.shadowColor = isCrashed ? '#f43f5e' : '#fff';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawGrid();
      drawCurve();
    };

    render();
    
    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * dpr;
      canvas.height = newRect.height * dpr;
      ctx.scale(dpr, dpr);
      render();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [multiplier, status]); // Redraw when multiplier or status changes

  return (
    <div className="relative flex-1 flex flex-col bg-[#050505] overflow-hidden rounded-3xl m-2 md:m-4 border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
      {/* Dynamic Multiplier Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="flex flex-col items-center">
          {isBetting ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
               <span className="text-4xl md:text-6xl font-black text-white/20 uppercase tracking-[0.2em] mb-4">Starting...</span>
               <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 animate-progress" style={{ width: '100%' }} />
               </div>
            </div>
          ) : (
            <>
              <span className={`text-[5rem] md:text-[8rem] lg:text-[12rem] font-black leading-none tracking-tighter drop-shadow-[0_0_40px_rgba(147,51,234,0.3)] ${isCrashed ? 'text-rose-500' : 'text-white'}`}>
                {multiplier.toFixed(2)}<span className={`text-2xl md:text-4xl ${isCrashed ? 'text-rose-500/50' : 'text-purple-500/50'}`}>x</span>
              </span>
              <div className={`mt-2 md:mt-4 px-4 py-1.5 md:px-6 md:py-2 rounded-full border backdrop-blur-md ${isCrashed ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                <span className={`text-[10px] md:text-sm font-bold uppercase tracking-[0.3em] ${isCrashed ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {isCrashed ? 'FROZEN' : 'Current Payout'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="w-full h-full opacity-60" />

      {/* Axis Labels */}
      <div className="absolute bottom-4 md:bottom-10 right-4 md:right-10 flex items-center gap-2 text-[10px] font-black text-zinc-700 uppercase tracking-widest">
        <span>Live Stream</span>
        <div className="w-8 h-[1px] bg-zinc-800" />
      </div>

      {/* Status Overlay */}
      <div className="absolute bottom-4 md:bottom-10 left-4 md:left-10 flex items-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isBetting ? 'bg-amber-500/10 border-amber-500/20' : 'bg-purple-600/10 border-purple-500/20'}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isBetting ? 'bg-amber-500' : 'bg-purple-500'}`} />
          <span className={`text-xs font-black uppercase tracking-widest ${isBetting ? 'text-amber-400' : 'text-purple-400'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
