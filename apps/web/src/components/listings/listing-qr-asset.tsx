'use client';

import * as React from 'react';
import { toDataURL } from 'qrcode';
import { Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ListingQrAssetProps {
  url: string;
  title: string;
  disabled?: boolean;
  downloadFileName?: string;
  onDownload?: () => void;
}

const QR_SIZE = 280;
const PRINT_WIDTH = 1200;
const PRINT_HEIGHT = 1600;

export function ListingQrAsset({
  url,
  title,
  disabled,
  downloadFileName = 'estateflow-qr.png',
  onDownload,
}: ListingQrAssetProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const isDisabled = disabled || !url;

  React.useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;

    toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: QR_SIZE,
      color: {
        dark: '#1C1917',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  async function handleDownload() {
    if (!qrDataUrl || isDisabled) return;

    const assetDataUrl = await buildPrintableQrAsset({
      qrDataUrl,
      title,
      url,
    });

    const anchor = document.createElement('a');
    anchor.href = assetDataUrl;
    anchor.download = downloadFileName;
    anchor.click();
    onDownload?.();
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Kod QR</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Gotowy asset PNG do materiałów drukowanych.
          </p>
        </div>
        <QrCode className="h-5 w-5 shrink-0 text-primary" />
      </div>

      <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-xl bg-muted/30 p-3">
        {qrDataUrl && !isDisabled ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={`Kod QR: ${title}`}
            className="h-40 w-40 rounded-lg bg-white"
          />
        ) : (
          <div className="text-center text-xs leading-5 text-muted-foreground">
            {url
              ? 'Generowanie kodu QR...'
              : 'Kod pojawi się po publikacji oferty.'}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        disabled={!qrDataUrl || isDisabled}
        className="mt-3 h-10 w-full gap-2 rounded-xl"
      >
        <Download className="h-4 w-4" />
        Pobierz PNG
      </Button>
    </div>
  );
}

async function buildPrintableQrAsset({
  qrDataUrl,
  title,
  url,
}: {
  qrDataUrl: string;
  title: string;
  url: string;
}): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH;
  canvas.height = PRINT_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return qrDataUrl;
  }

  ctx.fillStyle = '#FAFAF9';
  ctx.fillRect(0, 0, PRINT_WIDTH, PRINT_HEIGHT);

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 96, 96, PRINT_WIDTH - 192, PRINT_HEIGHT - 192, 36);
  ctx.fill();

  ctx.fillStyle = '#1C1917';
  ctx.font = '700 44px Inter, Arial, sans-serif';
  ctx.fillText('EstateFlow', 160, 190);

  ctx.fillStyle = '#57534E';
  ctx.font = '500 28px Inter, Arial, sans-serif';
  ctx.fillText('Publiczna oferta nieruchomości', 160, 238);

  drawWrappedText(ctx, title, 160, 350, PRINT_WIDTH - 320, 54, 3);

  const qrImage = await loadImage(qrDataUrl);
  const qrX = (PRINT_WIDTH - 560) / 2;
  ctx.drawImage(qrImage, qrX, 560, 560, 560);

  ctx.fillStyle = '#1C1917';
  ctx.font = '600 30px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Zeskanuj kod i zobacz ofertę', PRINT_WIDTH / 2, 1210);

  ctx.fillStyle = '#78716C';
  ctx.font = '400 24px Inter, Arial, sans-serif';
  drawWrappedText(ctx, url, 160, 1280, PRINT_WIDTH - 320, 36, 2, 'center');

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'left',
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';
  let consumedWords = 0;

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      consumedWords += 1;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
    consumedWords += 1;

    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  ctx.textAlign = align;
  ctx.fillStyle = align === 'center' ? '#78716C' : '#1C1917';

  const wasTruncated = consumedWords < words.length;
  lines.forEach((line, index) => {
    ctx.fillText(
      index === maxLines - 1 && wasTruncated
        ? `${line.replace(/[.,;:!?-]+$/, '')}...`
        : line,
      align === 'center' ? x + maxWidth / 2 : x,
      y + index * lineHeight,
      maxWidth,
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
