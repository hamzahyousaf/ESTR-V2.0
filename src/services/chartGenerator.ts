import { KLine, ScanResult } from '../types';

export function generateCandleChart(klines: KLine[], signal: ScanResult): string {
  const canvas = document.createElement('canvas');
  const width = 800;
  const height = 400;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = '#334155';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Calculate scales
  const minPrice = Math.min(...klines.map(k => k.low), signal.sl, signal.tp) * 0.999;
  const maxPrice = Math.max(...klines.map(k => k.high), signal.sl, signal.tp) * 1.001;
  const priceRange = maxPrice - minPrice;
  const candleWidth = (width - 40) / klines.length;

  const getY = (price: number) => height - ((price - minPrice) / priceRange) * height;

  // Draw Candlesticks
  klines.forEach((k, i) => {
    const x = i * candleWidth + 20;
    const isBullish = k.close >= k.open;
    const color = isBullish ? '#10B981' : '#EF4444';
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Wick
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, getY(k.high));
    ctx.lineTo(x + candleWidth / 2, getY(k.low));
    ctx.stroke();

    // Body
    const bodyTop = getY(Math.max(k.open, k.close));
    const bodyBottom = getY(Math.min(k.open, k.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);
    ctx.fillRect(x + 2, bodyTop, candleWidth - 4, bodyHeight);
  });

  // Entry, TP, SL lines
  ctx.lineWidth = 2;
  
  // Entry
  ctx.strokeStyle = '#3B82F6';
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(0, getY(signal.entry));
  ctx.lineTo(width, getY(signal.entry));
  ctx.stroke();
  ctx.fillStyle = '#3B82F6';
  ctx.fillText('ENTRY', 5, getY(signal.entry) - 5);

  // TP
  ctx.strokeStyle = '#10B981';
  ctx.beginPath();
  ctx.moveTo(0, getY(signal.tp));
  ctx.lineTo(width, getY(signal.tp));
  ctx.stroke();
  ctx.fillStyle = '#10B981';
  ctx.fillText('TP', 5, getY(signal.tp) - 5);

  // SL
  ctx.strokeStyle = '#EF4444';
  ctx.beginPath();
  ctx.moveTo(0, getY(signal.sl));
  ctx.lineTo(width, getY(signal.sl));
  ctx.stroke();
  ctx.fillStyle = '#EF4444';
  ctx.fillText('SL', 5, getY(signal.sl) - 5);

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Inter';
  ctx.fillText(`${signal.symbol} - ${signal.direction} (${signal.grade})`, 20, 30);
  ctx.font = '12px Inter';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('ESTR V2.0 Pro - AI Analytics', width - 180, 30);

  return canvas.toDataURL('image/png');
}
