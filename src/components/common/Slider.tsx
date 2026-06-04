import { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
} from "react-native";
import { colors } from "../../utils/colors";

export default function Slider({
  value,
  min,
  max,
  step,
  onValueChange,
  label,
  formatValue,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  label: string;
  formatValue?: (v: number) => string;
}) {
  const trackLayout = useRef({ x: 0, width: 0 });

  const snap = useCallback(
    (ratio: number) => {
      const raw = ratio * (max - min) + min;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step],
  );

  const getRatio = useCallback((pageX: number) => {
    const dx = pageX - trackLayout.current.x;
    return Math.max(0, Math.min(1, dx / trackLayout.current.width));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        onValueChange(snap(getRatio(e.nativeEvent.pageX))),
      onPanResponderMove: (e) =>
        onValueChange(snap(getRatio(e.nativeEvent.pageX))),
    }),
  ).current;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    e.target.measure((_x, _y, width, _h, pageX) => {
      trackLayout.current = { x: pageX, width };
    });
  }, []);

  const percent = ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : String(value);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueChip}>
          <Text style={styles.valueText}>{display}</Text>
        </View>
      </View>
      <View style={styles.trackOuter}>
        <View
          style={styles.track}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
        >
          <View
            style={[styles.trackFill, { width: `${percent}%` }]}
            pointerEvents="none"
          />
          <View
            style={[styles.thumb, { left: `${percent}%` }]}
            pointerEvents="none"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  valueChip: {
    backgroundColor: "rgba(124, 92, 231, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  valueText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  trackOuter: {
    paddingVertical: 4,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    justifyContent: "center",
  },
  trackFill: {
    position: "absolute",
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    marginLeft: -11,
    top: -8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
