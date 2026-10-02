import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type BarDatum = {
  key: string;
  value: number;
  /** Short axis label, e.g. "24 Sep". */
  label: string;
  /** Caption shown when the bar is selected, e.g. "24 Sep · 8.4 L/100 km". */
  caption: string;
};

type BarChartProps = {
  data: BarDatum[];
  /** Dashed reference line, e.g. the average. */
  reference?: { value: number; label: string };
  height?: number;
  accessibilityLabel: string;
};

/**
 * Single-series column chart: one hue, thin bars with 2px gaps and rounded tops, a recessive
 * baseline, an optional dashed reference line, and tap-to-read values (the latest is selected).
 */
export function BarChart({ data, reference, height = 120, accessibilityLabel }: BarChartProps) {
  const theme = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (data.length === 0) return null;

  const selected = data.find((d) => d.key === selectedKey) ?? data.at(-1)!;
  const max = Math.max(...data.map((d) => d.value), reference?.value ?? 0) * 1.1 || 1;
  // Start bars from a floor near the minimum so small differences stay visible.
  const min = Math.max(0, Math.min(...data.map((d) => d.value), reference?.value ?? Infinity) * 0.7);
  const scale = (v: number) => ((v - min) / (max - min)) * height;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <ThemedText style={styles.caption}>{selected.caption}</ThemedText>
      <View style={[styles.plot, { height }]}>
        {reference && (
          <View style={[styles.reference, { bottom: scale(reference.value) }]} pointerEvents="none">
            <View style={[styles.referenceLine, { borderColor: theme.textSecondary }]} />
            {/* Label sits above the line's start on the card surface so bars never cover it. */}
            <ThemedText
              style={[styles.referenceLabel, { backgroundColor: theme.backgroundElement }]}
              themeColor="textSecondary">
              {reference.label}
            </ThemedText>
          </View>
        )}
        {data.map((d) => {
          const isSelected = d.key === selected.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityLabel={d.caption}
              onPress={() => setSelectedKey(d.key)}
              style={styles.slot}>
              {isSelected && (
                <View style={[styles.marker, { backgroundColor: theme.text, bottom: scale(d.value) + 6 }]} />
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(3, scale(d.value)),
                    backgroundColor: theme.chart,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.baseline, { backgroundColor: theme.border }]} />
      <View style={styles.axis}>
        <ThemedText style={styles.axisLabel} themeColor="textSecondary">
          {data[0]!.label}
        </ThemedText>
        {data.length > 1 && (
          <ThemedText style={styles.axisLabel} themeColor="textSecondary">
            {data.at(-1)!.label}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  slot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 1, // 2px gap between neighbouring bars
  },
  bar: {
    width: '100%',
    maxWidth: 22,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  marker: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  reference: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  referenceLine: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  referenceLabel: {
    position: 'absolute',
    bottom: 3,
    start: 0,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 500,
  },
  baseline: {
    height: 1,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
