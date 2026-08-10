"use client";

import { useEffect, useRef, useState } from "react";

import {
  formatLineChartValue,
  getCleanPoints,
  getXAxisLabelIndexes
} from "../../lib/client/formatting.js";

export default function SeriesChart({ series }) {
  const initialPoints = getCleanPoints(series?.points);
  const [range, setRange] = useState({ start: 0, end: Math.max(0, initialPoints.length - 1) });
  const [tooltip, setTooltip] = useState(null);
  const canvasRef = useRef(null);
  const plottedPointsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => {
      const cleanPoints = getCleanPoints(series?.points);
      const visiblePoints = cleanPoints.slice(range.start, range.end + 1);
      plottedPointsRef.current = drawChart(canvas, visiblePoints, series?.unit);
    };

    draw();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", draw);
      return () => window.removeEventListener("resize", draw);
    }

    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [range.end, range.start, series?.points, series?.unit]);

  const cleanPoints = getCleanPoints(series?.points);
  const maxIndex = Math.max(0, cleanPoints.length - 1);

  function updateRange(edge, rawValue) {
    const nextValue = Math.max(0, Math.min(maxIndex, Number(rawValue)));
    setRange(current => edge === "start"
      ? { start: Math.min(nextValue, current.end), end: current.end }
      : { start: current.start, end: Math.max(nextValue, current.start) });
  }

  function showTooltip(event) {
    const plottedPoints = plottedPointsRef.current;
    if (!plottedPoints.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const nearest = plottedPoints.reduce((best, point) => (
      Math.abs(point.x - mouseX) < Math.abs(best.x - mouseX) ? point : best
    ), plottedPoints[0]);
    setTooltip({
      left: nearest.x,
      top: nearest.y,
      period: nearest.period,
      value: formatLineChartValue(nearest.value)
    });
  }

  return (
    <>
      <div className="chart-wrap">
        <canvas
          ref={canvasRef}
          aria-label="Line chart"
          onMouseMove={showTooltip}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip ? (
          <div
            className="chart-tooltip"
            role="status"
            aria-live="polite"
            style={{ display: "block", left: tooltip.left, top: tooltip.top }}
          >
            {tooltip.period}<br />{tooltip.value}
          </div>
        ) : null}
      </div>

      {cleanPoints.length > 1 ? (
        <div className="range-filter" aria-label="Displayed graph date range">
          <div className="range-values">
            <span>{cleanPoints[range.start]?.period || ""}</span>
            <span>{cleanPoints[range.end]?.period || ""}</span>
          </div>
          <div className="range-controls">
            <input
              type="range" min="0" max={maxIndex} step="1" value={range.start}
              onInput={event => updateRange("start", event.currentTarget.value)}
              aria-label="Graph beginning period"
            />
            <input
              type="range" min="0" max={maxIndex} step="1" value={range.end}
              onInput={event => updateRange("end", event.currentTarget.value)}
              aria-label="Graph ending period"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function drawChart(canvas, points, unit) {
  const context = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 240;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const cleanPoints = getCleanPoints(points);
  if (cleanPoints.length === 0) {
    context.fillText("No numeric data to graph.", 20, 30);
    return [];
  }

  const values = cleanPoints.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const valueRange = max - min || Math.abs(max) || 1;
  const left = 76;
  const right = 30;
  const top = 30;
  const bottom = 62;
  const chartWidth = Math.max(10, width - left - right);
  const chartHeight = Math.max(10, height - top - bottom);
  const x = index => cleanPoints.length === 1
    ? left + chartWidth / 2
    : left + (index / (cleanPoints.length - 1)) * chartWidth;
  const y = value => top + chartHeight - ((value - min) / valueRange) * chartHeight;
  const plottedPoints = cleanPoints.map((point, index) => ({ ...point, x: x(index), y: y(point.value) }));

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
  context.fillText(unit || "Value", left, 16);
  drawXAxisLabels(context, cleanPoints, getXAxisLabelIndexes(cleanPoints), x, top + chartHeight + 24);

  context.beginPath();
  plottedPoints.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.strokeStyle = "#0057d9";
  context.lineWidth = 3;
  context.stroke();
  plottedPoints.forEach(point => {
    context.beginPath();
    context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    context.fillStyle = "#0057d9";
    context.fill();
  });
  return plottedPoints;
}

function drawXAxisLabels(context, points, indexes, x, y) {
  const lastIndex = points.length - 1;
  const sortedIndexes = indexes.filter(index => index >= 0 && index <= lastIndex).sort((left, right) => left - right);
  if (sortedIndexes.length === 0) return;

  context.textAlign = "left";
  context.fillText(points[0]?.period || "", x(0), y);

  const lastLabel = points[lastIndex]?.period || "";
  const lastWidth = context.measureText(lastLabel).width;
  const firstWidth = context.measureText(points[0]?.period || "").width;
  let occupiedRight = x(0) + firstWidth + 8;
  const lastLeft = x(lastIndex) - lastWidth - 8;

  context.textAlign = "center";
  for (const index of sortedIndexes) {
    if (index === 0 || index === lastIndex) continue;
    const label = points[index]?.period || "";
    const halfWidth = context.measureText(label).width / 2;
    const labelLeft = x(index) - halfWidth;
    const labelRight = x(index) + halfWidth;
    if (labelLeft <= occupiedRight || labelRight >= lastLeft) continue;
    context.fillText(label, x(index), y);
    occupiedRight = labelRight + 8;
  }

  context.textAlign = "right";
  context.fillText(lastLabel, x(lastIndex), y);
  context.textAlign = "left";
}
