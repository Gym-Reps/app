import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Body } from './Text';
import { colors, radius, font } from '../utils/theme';

/** Maps a numeric series to SVG points within a viewBox. */
function toPoints(values: number[], w: number, h: number, pad = 6) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y };
  });
}

/** Full line chart with gridlines and the latest point emphasised. */
export function LineChart({ data, months }: { data: number[]; months: string[] }) {
  const W = 250;
  const H = 130;
  const pts = toPoints(data, W, H, 14);
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <View style={styles.lineWrap}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={130}>
        {[30, 70, 110].map((y, i) => (
          <Line
            key={y}
            x1={14}
            y1={y}
            x2={240}
            y2={y}
            stroke={i === 0 ? colors.track : '#f0f0f0'}
            strokeWidth={1.5}
            strokeDasharray="3 4"
          />
        ))}
        <Polyline
          points={polyline}
          fill="none"
          stroke={colors.coral}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => {
          const last = i === pts.length - 1;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={last ? 4.5 : 3.5}
              fill={last ? colors.coral : '#fff'}
              stroke={last ? colors.ink : colors.coral}
              strokeWidth={last ? 2 : 2.5}
            />
          );
        })}
      </Svg>
      <View style={styles.axis}>
        {months.map((m) => (
          <Body key={m} size={11} color={colors.textGhost}>{m}</Body>
        ))}
      </View>
    </View>
  );
}

/** Small inline trend line for "by exercise" rows. */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = toPoints(data, 90, 26, 3);
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <Svg viewBox="0 0 90 26" width={90} height={26}>
      <Polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Circular progress ring with a centered percentage. */
export function ProgressRing({ percent }: { percent: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <Svg viewBox="0 0 80 80" width={74} height={74}>
      <Circle cx={40} cy={40} r={r} fill="none" stroke="#eee" strokeWidth={9} />
      <Circle
        cx={40}
        cy={40}
        r={r}
        fill="none"
        stroke={colors.coral}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${c}`}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      <SvgText
        x={40}
        y={47}
        textAnchor="middle"
        fontFamily={font.display}
        fontSize={18}
        fill={colors.ink}
      >
        {`${percent}%`}
      </SvgText>
    </Svg>
  );
}

/** Simple vertical bar chart from an array of percentage heights. */
export function BarChart({
  heights,
  labels,
  height = 80,
}: {
  heights: number[];
  labels?: string[];
  height?: number;
}) {
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {heights.map((h, i) => {
          const last = i === heights.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: `${h}%`,
                  backgroundColor: last ? colors.coral : '#f0d9d4',
                },
              ]}
            />
          );
        })}
      </View>
      {labels != null && (
        <View style={styles.barAxis}>
          {labels.map((l, i) => (
            <Body key={i} size={11} color={colors.textGhost}>{l}</Body>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lineWrap: {},
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bar: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  barAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
