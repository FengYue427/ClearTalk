/**
 * 生成可分享的精美图片卡片（Canvas，无额外依赖）
 */

import { APP_INFO } from '../core/config.js';

const CARD_WIDTH = 720;
const CARD_PADDING = 40;
const LINE_HEIGHT = 28;
const MAX_LINES = 18;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text).split('\n');

  for (const para of paragraphs) {
    let line = '';
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (lines.length >= MAX_LINES) break;
  }

  if (lines.length > MAX_LINES) {
    lines[MAX_LINES - 1] = lines[MAX_LINES - 1].slice(0, -1) + '…';
  }
  return lines.slice(0, MAX_LINES);
}

/**
 * 生成分享卡片 PNG Blob
 * @param {{ text: string, sceneName?: string, toneLabel?: string }} options
 */
export async function generateShareCardBlob(options) {
  const { text, sceneName = '', toneLabel = '' } = options;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cleartalk.app';

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = '18px system-ui, -apple-system, "Segoe UI", sans-serif';
  const contentWidth = CARD_WIDTH - CARD_PADDING * 2;
  const lines = wrapText(measureCtx, text, contentWidth);
  const contentHeight = lines.length * LINE_HEIGHT;
  const headerHeight = 100;
  const footerHeight = 120;
  const cardHeight = headerHeight + contentHeight + footerHeight + CARD_PADDING;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, cardHeight);
  gradient.addColorStop(0, '#5B8DEF');
  gradient.addColorStop(1, '#7C5CFF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, 56);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(APP_INFO.name, CARD_PADDING, 36);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 56, CARD_WIDTH, cardHeight - 56);

  let y = headerHeight;

  if (sceneName) {
    ctx.fillStyle = '#5B8DEF';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(sceneName + (toneLabel ? ` · ${toneLabel}` : ''), CARD_PADDING, y);
    y += 28;
  }

  ctx.fillStyle = '#1e293b';
  ctx.font = '18px system-ui, sans-serif';
  for (const line of lines) {
    ctx.fillText(line, CARD_PADDING, y);
    y += LINE_HEIGHT;
  }

  const footerY = cardHeight - footerHeight + 20;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(CARD_PADDING, footerY - 16);
  ctx.lineTo(CARD_WIDTH - CARD_PADDING, footerY - 16);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('扫码或访问使用 ClearTalk 生成你的沟通文本', CARD_PADDING, footerY + 4);

  try {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(shareUrl)}`;
    const qrImg = await loadImage(qrSrc);
    ctx.drawImage(qrImg, CARD_WIDTH - CARD_PADDING - 96, footerY - 8, 96, 96);
  } catch {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(shareUrl.replace(/^https?:\/\//, ''), CARD_PADDING, footerY + 28);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

export async function downloadShareCard(options, filename = 'cleartalk-share.png') {
  const blob = await generateShareCardBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return blob;
}

export async function shareCardImage(options) {
  const blob = await generateShareCardBlob(options);
  const file = new File([blob], 'cleartalk-share.png', { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: APP_INFO.name,
      text: options.text?.slice(0, 100),
      files: [file]
    });
    return true;
  }

  await downloadShareCard(options);
  return false;
}
