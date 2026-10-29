
      import React, { useState, useEffect, useRef, useCallback } from 'react';
      import ReactDOM from 'react-dom/client';
      import { 
        ZoomIn, ZoomOut, RotateCcw, Sparkles, Map as MapIcon, 
        Settings, Trophy, Target, ChevronRight, PlayCircle, Menu, X, MousePointer2, ChevronLeft, Info, Wind 
      } from 'lucide-react';

      const COLOR_SCHEMES = {
        classic: { name: 'Classic Blue', baseHue: 200 },
        fire: { name: 'Inferno', baseHue: 0 },
        ocean: { name: 'Abyssal Ocean', baseHue: 190 },
        purple: { name: 'Cosmic Purple', baseHue: 280 },
        matrix: { name: 'Digital Rain', baseHue: 120 },
        sunset: { name: 'Vaporwave Sunset', baseHue: 330 },
        psychedelic: { name: 'Psychedelic', baseHue: 60 }
      };

      const INTERESTING_LOCATIONS = [
        { name: 'The Root', x: -0.5, y: 0, z: 1, desc: 'Where it all begins.' },
        { name: 'Seahorse Valley', x: -0.7463, y: 0.1102, z: 100, desc: 'Countless seahorse-like filaments.' },
        { name: 'Spiral Galaxy', x: -0.74364, y: 0.13182, z: 2000, desc: 'Infinite rotating structures.' },
        { name: 'Elephant Valley', x: -0.1011, y: 0.9563, z: 100, desc: 'Bulbous, organic shapes.' },
        { name: 'The Satellite', x: -0.7269, y: 0.1889, z: 5000, desc: 'A perfect miniature set.' }
      ];

      const MANDELBROT_FACTS = [
        "The set is defined by z = z² + c.",
        "It was named after Benoit Mandelbrot.",
        "The boundary has infinite length.",
        "Self-similarity occurs at every scale.",
        "It contains an infinite number of mini-sets.",
        "Benoit Mandelbrot coined 'fractal' in 1975.",
        "Points inside never escape to infinity.",
        "The cardioid is the largest structure.",
        "Its area is approximately 1.506.",
        "It is a visualization of the complex plane.",
        "Julia sets are related to each point 'c'.",
        "It is the most famous object in chaos theory.",
        "Zooming reveals infinite worlds.",
        "Calculated using complex number iteration.",
        "The 'Main Cardioid' is the heart of the set."
      ];

      const hslToRgb = (h, s, l) => {
        let r, g, b;
        if (s === 0) r = g = b = l;
        else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      };

      const getColor = (iteration, maxIter, scheme) => {
        if (iteration === maxIter) return [0, 0, 0];
        const t = iteration / maxIter;
        const config = COLOR_SCHEMES[scheme];
        const hue = (config.baseHue + t * 360) % 360;
        if (scheme === 'matrix') return [0, Math.round(255 * t * 2), 0];
        if (scheme === 'fire') return [Math.min(255, t * 510), Math.min(255, Math.max(0, t * 510 - 255)), 0];
        return hslToRgb(hue / 360, 0.7, 0.2 + t * 0.6);
      };

      const App = () => {
        const [view, setView] = useState({ centerX: -0.5, centerY: 0, zoom: 1, maxIterations: 128, colorScheme: 'classic' });
        const [stats, setStats] = useState({ zoom: 1, time: 0 });
        const [sidebarOpen, setSidebarOpen] = useState(false);
        const [hasInteractedWithSidebar, setHasInteractedWithSidebar] = useState(false);
        const [isRendering, setIsRendering] = useState(false);
        const [isContinuous, setIsContinuous] = useState(false);
        const [zoomSpeed, setZoomSpeed] = useState(1.03); 
        const [aiAnalysis, setAiAnalysis] = useState(null);
        const [isAnalyzing, setIsAnalyzing] = useState(false);
        
        const [fact, setFact] = useState(MANDELBROT_FACTS[0]);
        const [bubblePos, setBubblePos] = useState({ x: -1000, y: -1000 });
        const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);

        const canvasRef = useRef(null);
        const isDragging = useRef(false);
        const lastMouse = useRef({ x: 0, y: 0 });
        const mouseDownTime = useRef(0);
        const mouseDownPos = useRef({ x: 0, y: 0 });

        useEffect(() => {
          const timer = setInterval(() => setStats(s => ({ ...s, time: s.time + 1 })), 1000);
          return () => clearInterval(timer);
        }, []);

        useEffect(() => {
          const factTimer = setInterval(() => {
            setFact(MANDELBROT_FACTS[Math.floor(Math.random() * MANDELBROT_FACTS.length)]);
            updateBubblePosition();
          }, 10000);
          return () => clearInterval(factTimer);
        }, [view]);

        const getIterationAt = (px, py, width, height, viewState) => {
          const { centerX, centerY, zoom, maxIterations } = viewState;
          const scale = 3.5 / zoom;
          const ratio = width / height;
          const x0 = centerX + ((px - width/2) * scale * ratio) / width;
          const y0 = centerY + ((py - height/2) * scale) / height;
          let x = 0, y = 0, iter = 0;
          while (x*x + y*y <= 4 && iter < maxIterations) {
            const xt = x*x - y*y + x0;
            y = 2*x*y + y0; x = xt; iter++;
          }
          return iter;
        };

        const updateBubblePosition = useCallback(() => {
          if (!canvasRef.current) return;
          const { width, height } = canvasRef.current;
          const cardWidth = 260;
          const cardHeight = 120;
          const centerX = width / 2;
          const centerY = height / 2;

          const samples = [];
          const radii = [width * 0.15, width * 0.25, width * 0.35];
          const angles = [0, 45, 90, 135, 180, 225, 270, 315];

          radii.forEach(r => {
            angles.forEach(a => {
              const angleRad = (a * Math.PI) / 180;
              samples.push({
                x: centerX + Math.cos(angleRad) * r - cardWidth/2,
                y: centerY + Math.sin(angleRad) * r - cardHeight/2
              });
            });
          });

          let bestPos = { x: centerX - cardWidth/2, y: centerY - cardHeight/2 };
          let bestScore = -1;

          samples.forEach(pos => {
            const iter = getIterationAt(pos.x + cardWidth/2, pos.y + cardHeight/2, width, height, view);
            const isEmpty = iter === view.maxIterations || iter < 12;
            const score = isEmpty ? 100 : (iter < 20 ? 40 : 0);
            
            const distToCenter = Math.sqrt(Math.pow(pos.x + cardWidth/2 - centerX, 2) + Math.pow(pos.y + cardHeight/2 - centerY, 2));
            const scoreBias = (distToCenter / (width/2)) * 10; 
            
            if (score + scoreBias > bestScore) {
              bestScore = score + scoreBias;
              bestPos = pos;
            }
          });

          setBubblePos(bestPos);
        }, [view]);

        const draw = useCallback(() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          setIsRendering(true);
          const ctx = canvas.getContext('2d');
          const { width, height } = canvas;
          const { centerX, centerY, zoom, maxIterations, colorScheme } = view;
          const imageData = ctx.createImageData(width, height);
          const data = imageData.data;
          const scale = 3.5 / zoom;
          const ratio = width / height;

          requestAnimationFrame(() => {
            for (let px = 0; px < width; px++) {
              for (let py = 0; py < height; py++) {
                const x0 = centerX + ((px - width/2) * scale * ratio) / width;
                const y0 = centerY + ((py - height/2) * scale) / height;
                let x = 0, y = 0, iter = 0;
                while (x*x + y*y <= 4 && iter < maxIterations) {
                  const xt = x*x - y*y + x0;
                  y = 2*x*y + y0; x = xt; iter++;
                }
                const idx = (py * width + px) * 4;
                const [r, g, b] = getColor(iter, maxIterations, colorScheme);
                data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 255;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            setIsRendering(false);
            setStats(s => ({ ...s, zoom: view.zoom }));
          });
        }, [view]);

        useEffect(() => {
          const handleResize = () => {
            if (canvasRef.current) {
              canvasRef.current.width = canvasRef.current.offsetWidth;
              canvasRef.current.height = canvasRef.current.offsetHeight;
              draw();
              updateBubblePosition();
            }
          };
          window.addEventListener('resize', handleResize);
          handleResize();
          return () => window.removeEventListener('resize', handleResize);
        }, [draw, updateBubblePosition]);

        useEffect(() => {
          if (isContinuous) {
            const t = setInterval(() => setView(v => ({ ...v, zoom: v.zoom * zoomSpeed })), 40);
            return () => clearInterval(t);
          }
        }, [isContinuous, zoomSpeed]);

        const toggleSidebar = () => {
          setSidebarOpen(!sidebarOpen);
          setHasInteractedWithSidebar(true);
        };

        const onMouseDown = (e) => {
          isDragging.current = true;
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          lastMouse.current = { x: clientX, y: clientY };
          mouseDownPos.current = { x: clientX, y: clientY };
          mouseDownTime.current = Date.now();
        };

        const onMouseMove = (e) => {
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          if (!isDragging.current) return;
          const { width, height } = canvasRef.current;
          const dx = clientX - lastMouse.current.x;
          const dy = clientY - lastMouse.current.y;
          const sc = 3.5 / view.zoom;
          const r = width / height;
          setView(v => ({ ...v, centerX: v.centerX - (dx * sc * r) / width, centerY: v.centerY - (dy * sc) / height }));
          lastMouse.current = { x: clientX, y: clientY };
        };

        const onMouseUp = (e) => {
          if (!isDragging.current) return;
          isDragging.current = false;
          const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
          const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
          const dx = Math.abs(clientX - mouseDownPos.current.x);
          const dy = Math.abs(clientY - mouseDownPos.current.y);
          const duration = Date.now() - mouseDownTime.current;
          if (dx < 10 && dy < 10 && duration < 300) {
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;
            const { width, height } = canvasRef.current;
            const scale = 3.5 / view.zoom;
            const ratio = width / height;
            const clickX = view.centerX + ((mouseX - width/2) * scale * ratio) / width;
            const clickY = view.centerY + ((mouseY - height/2) * scale) / height;
            setView(v => ({ ...v, centerX: clickX, centerY: clickY, zoom: v.zoom * 2 }));
          }
        };

        return (
          <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
            
            {/* x9m8 Mandelbrot Explorer Facts Bubble - Disabled on Mobile (hidden by default, md:block for desktops) */}
            {!sidebarOpen && (
              <div 
                className="fact-bubble fixed pointer-events-none md:block hidden"
                style={{ 
                  left: bubblePos.x, 
                  top: bubblePos.y,
                  opacity: isRendering ? 0 : 0.85
                }}
              >
                <div className="bg-slate-950/70 backdrop-blur-2xl border border-blue-500/20 rounded-3xl px-6 py-4 shadow-2xl max-w-[280px] text-center">
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-2 opacity-90 flex items-center justify-center gap-2">
                    <Sparkles size={12} className="animate-pulse text-blue-300"/> x9m8 Mandelbrot Explorer Facts
                  </p>
                  <p className="text-[12px] text-slate-200 leading-relaxed font-medium tracking-tight">
                    {fact}
                  </p>
                </div>
              </div>
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-500 ease-in-out bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col shadow-2xl
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
              w-full max-w-[320px] sm:w-80`}>
              
              <div className="p-6 flex justify-between items-center border-b border-slate-800/50">
                <h1 className="text-xl font-bold text-blue-400 flex items-center gap-2 tracking-tight"><Sparkles size={20}/> Explorer</h1>
                <button onClick={toggleSidebar} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <ChevronLeft size={20}/>
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <MousePointer2 size={10}/> Explorer Guide
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Left-click to zoom, drag to navigate. Floating facts inhabit the silent, empty regions of the fractal plane on larger screens.
                  </p>
                </div>

                <section>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 tracking-widest flex items-center gap-2">
                    <Wind size={12}/> Flight Control
                  </p>
                  <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-semibold text-slate-300">Auto-Pilot Warp Factor</span>
                      <span className="text-[11px] font-mono text-blue-400">{((zoomSpeed - 1) * 100).toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.005" 
                      max="1.15" 
                      step="0.005" 
                      value={zoomSpeed} 
                      onChange={(e) => setZoomSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                      <span>Slow</span>
                      <span>High Velocity</span>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setView(v => ({...v, zoom: v.zoom*2}))} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-xs transition-colors flex items-center justify-center gap-2 font-semibold"><ZoomIn size={14}/> Zoom In</button>
                  <button onClick={() => setView(v => ({...v, zoom: v.zoom*0.5}))} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-xs transition-colors flex items-center justify-center gap-2 font-semibold"><ZoomOut size={14}/> Zoom Out</button>
                </div>

                <section>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 tracking-widest">Aesthetic Shift</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {Object.keys(COLOR_SCHEMES).map(s => (
                      <button key={s} onClick={() => setView(v => ({...v, colorScheme: s}))} className={`w-full text-left p-3 rounded-lg text-[11px] border transition-all font-medium ${view.colorScheme === s ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:bg-slate-800'}`}>
                        {COLOR_SCHEMES[s].name}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 tracking-widest">Co-ordinates</p>
                  <div className="space-y-1.5">
                    {INTERESTING_LOCATIONS.map(l => (
                      <button key={l.name} onClick={() => { setView({...view, centerX: l.x, centerY: l.y, zoom: l.z}); if (window.innerWidth < 640) setSidebarOpen(false); }} className="w-full text-left p-3.5 bg-slate-800/40 hover:bg-slate-800 rounded-lg text-xs border border-slate-700/50 transition-all group">
                        <div className="flex justify-between items-center"><span className="font-bold group-hover:text-blue-400 tracking-tight">{l.name}</span><ChevronRight size={12}/></div>
                        <div className="opacity-40 text-[10px] mt-1.5 line-clamp-1 italic">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-5 bg-slate-900 border-t border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-2.5 tracking-widest">
                  <span>Zoom Multiplier</span>
                  <span className="text-blue-400 tracking-tighter font-mono">{stats.zoom.toExponential(1)}x</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (Math.log10(stats.zoom) / 12) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative bg-black flex flex-col">
              <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
                <button 
                  onClick={toggleSidebar} 
                  className={`p-3 bg-slate-900/80 backdrop-blur-md border rounded-full hover:bg-slate-800 transition-all shadow-xl
                    ${!hasInteractedWithSidebar ? 'highlight-hint' : 'border-slate-700'}`}
                >
                  <Menu size={20}/>
                </button>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl max-sm:hidden">
                  <span className="text-[10px] font-mono text-slate-400 tracking-widest">X: {view.centerX.toFixed(6)} | Y: {view.centerY.toFixed(6)}</span>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-5 py-2 hidden sm:flex items-center shadow-xl">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 tracking-tight whitespace-nowrap">x9m8 Mandelbrot Explorer</span>
                </div>
              </div>

              <canvas 
                ref={canvasRef} 
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={onMouseMove}
                onTouchEnd={onMouseUp}
                onMouseEnter={() => setIsMouseOverCanvas(true)}
                onMouseLeave={() => setIsMouseOverCanvas(false)}
                className="w-full h-full cursor-crosshair" 
              />

              {/* Suppress rendering message during Auto-Pilot Zoom for visual clarity */}
              {isRendering && !isContinuous && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-3 bg-slate-900/50 backdrop-blur-lg rounded-full border border-slate-700 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 animate-pulse pointer-events-none text-center hidden md:block">
                  Rendering Mathematical Infinity
                </div>
              )}

              {aiAnalysis && (
                <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:w-80 bg-slate-900/95 backdrop-blur-2xl p-7 rounded-3xl border border-blue-500/20 shadow-2xl z-[45] hidden md:block">
                  <button onClick={() => setAiAnalysis(null)} className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 transition-colors"><X size={18}/></button>
                  <div className="flex items-center gap-2 text-blue-400 mb-4 uppercase tracking-[0.15em] font-bold text-[10px]">
                    <Sparkles size={14}/> Cognitive Insight
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-blue-50 tracking-tight leading-tight">{aiAnalysis.title}</h3>
                  <p className="text-sm text-slate-300 italic mb-6 leading-relaxed opacity-90">"{aiAnalysis.description}"</p>
                  <div className="pt-5 border-t border-slate-800/50 flex items-start gap-3.5 text-[11px]">
                    <Target className="text-blue-500 mt-0.5 shrink-0" size={16}/>
                    <p className="text-slate-400"><span className="text-blue-400 font-bold uppercase mr-1.5">Explore:</span> {aiAnalysis.suggestion}</p>
                  </div>
                </div>
              )}

              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
                <button 
                  onClick={() => setIsContinuous(!isContinuous)} 
                  className={`p-4 rounded-2xl border shadow-2xl transition-all duration-500 active:scale-90 ${isContinuous ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/40' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'}`}
                  title="Auto-Pilot Zoom"
                >
                  <PlayCircle size={26} className={isContinuous ? 'animate-pulse' : ''}/>
                </button>
                <button 
                  onClick={() => setView({...view, centerX: -0.5, centerY: 0, zoom: 1})} 
                  className="p-4 bg-slate-900/80 border border-slate-700 rounded-2xl text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-2xl active:scale-90"
                  title="Reset World"
                >
                  <RotateCcw size={26}/>
                </button>
              </div>
            </div>
          </div>
        );
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    