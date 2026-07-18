"use client";

import { useEffect, useRef } from "react";

import { formatLineChartValue, getCleanPoints } from "../../lib/client/formatting.js";

const COLORS = ["#0057d9", "#d14900", "#16803c", "#8b5a00", "#a51c30", "#007c91", "#6b4c9a"];

export default function ComparisonChart({ comparison }) {
  const canvasRef = useRef(null);
  const series = (comparison?.countries || [])
    .filter(country => country.series?.points?.length)
    .map((country, index) => ({
      name: country.geography.name,
      color: COLORS[index % COLORS.length],
      unit: country.series.unit,
      points: getCleanPoints(country.series.points)
    }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const draw = () => drawComparisonChart(canvas, series);
    draw();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", draw);
      return () => window.removeEventListener("resize", draw);
    }
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [series]);

  if (series.length === 0) return <p className="muted">No numeric observations are available to graph.</p>;

  return (
    <>
      <div className="comparison-legend" aria-label="Chart countries">
        {series.map(item => (
          <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>
        ))}
      </div>
      <div className="chart-wrap comparison-chart-wrap">
        <canvas ref={canvasRef} aria-label={`${comparison.title} comparison chart with one line per available country`} />
      </div>
    </>
  );
}

function drawComparisonChart(canvas, series) {
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 300;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const periods = [...new Set(series.flatMap(item => item.points.map(point => point.period)))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
  const values = series.flatMap(item => item.points.map(point => point.value));
  if (periods.length === 0 || values.length === 0) return;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) || 1;
  const left = 76;
  const right = 24;
  const top = 24;
  const bottom = 48;
  const chartWidth = Math.max(10, width - left - right);
  const chartHeight = Math.max(10, height - top - bottom);
  const x = period => left + (periods.indexOf(period) / Math.max(1, periods.length - 1)) * chartWidth;
  const y = value => top + chartHeight - ((value - min) / range) * chartHeight;

  context.font = "12px Arial";
  context.fillStyle = "#374151";
  context.strokeStyle = "#d1d5db";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, top + chartHeight);
  context.lineTo(left + chartWidth, top + chartHeight);
  context.stroke();
  context.fillText(formatLineChartValue(max), 8, top + 4);
  context.fillText(formatLineChartValue(min), 8, top + chartHeight);
  context.fillText(series[0]?.unit || "Value", left, 15);
  context.fillText(periods[0] || "", left, top + chartHeight + 24);
  context.textAlign = "right";
  context.fillText(periods.at(-1) || "", left + chartWidth, top + chartHeight + 24);
  context.textAlign = "left";

  for (const item of series) {
    context.beginPath();
    item.points.forEach((point, index) => {
      if (index === 0) context.moveTo(x(point.period), y(point.value));
      else context.lineTo(x(point.period), y(point.value));
    });
    context.strokeStyle = item.color;
    context.lineWidth = 2.5;
    context.stroke();
  }
}
