// src/components/OHLCChart.js
import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-chart-financial';

export default function OHLCChart({ symbol, token }) {
  const chartRef = useRef(null);

  useEffect(() => {
    fetch(`http://localhost/PaperTrade/Broker/public/api/ohlc?symbol=${symbol}&periods=30&interval=3600`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(({ data }) => {
        const ctx = chartRef.current.getContext('2d');
        new Chart(ctx, {
          type: 'candlestick',
          data: {
            datasets: [{
              label: `${symbol} OHLC`,
              data: data.map(c => ({
                x: new Date(c.TIMESTAMP * 1000),
                o: Number(c.OPEN),
                h: Number(c.HIGH),
                l: Number(c.LOW),
                c: Number(c.CLOSE)
              }))
            }]
          }
        });
      });
  }, [symbol, token]);

  return <canvas ref={chartRef}></canvas>;
}
