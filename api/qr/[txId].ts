import type { VercelRequest, VercelResponse } from '@vercel/node';
import QRCode from 'qrcode';

/**
 * Vercel Serverless Function để generate QR code cho mỗi giao dịch
 * URL: /api/qr/[txId]
 * Ví dụ: /api/qr/abc123 → Generate QR code cho transaction ID "abc123"
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { txId } = req.query;

  if (!txId || typeof txId !== 'string') {
    return res.status(400).json({ error: 'Missing transaction ID' });
  }

  try {
    // URL mà QR code sẽ link tới
    const confirmUrl = `https://agribank-management.vercel.app/confirm?tx=${txId}`;

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(confirmUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    // Set headers for image response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache 1 year
    res.setHeader('Content-Disposition', `inline; filename="qr-${txId}.png"`);

    return res.send(qrBuffer);
  } catch (error) {
    console.error('QR generation error:', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
}
