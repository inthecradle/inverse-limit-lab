import { useEffect, useRef, useState } from "react";
import {
  applyFeedback,
  coherentFamily,
  createInitialFamily,
  createLayers,
  diagnostics,
  familyDistance,
  resizeSystem,
  type Family,
  type Layer,
} from "../model";
import {
  representationReport,
  type RepresentationMode,
} from "../model/representationModel";

type Experiment = {
  layers: Layer[];
  family: Family;
  initial: Family | null;
  distances: number[];
  n: number;
};

function fresh(): Experiment {
  const layers = createLayers(6);
  return {
    layers,
    family: createInitialFamily(layers),
    initial: null,
    distances: [],
    n: 0,
  };
}

/** Owns the selected thread, iteration history, and the playback lifecycle. */
export function useExperiment() {
  const [experiment, setExperiment] = useState<Experiment>(fresh);
  const [rate, setRate] = useState(0.65);
  const [playing, setPlaying] = useState(false);
  const [representation, setRepresentation] =
    useState<RepresentationMode>("absent");
  const [notice, setNotice] = useState(
    "点はタップ、ドラッグ、矢印キーで動かせます。",
  );
  const { layers, family, n } = experiment;
  const result = diagnostics(layers, family);
  const target = coherentFamily(layers, 0.2);
  const distance = familyDistance(layers, family, target);
  const report = representationReport(
    layers,
    family,
    rate,
    0.2,
    representation,
  );
  const advanceRef = useRef<() => void>(() => {});

  function selectFamily(next: Family, message: string) {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment((prev) => ({
      ...prev,
      family: next,
      initial: null,
      distances: [],
      n: 0,
    }));
    setNotice(message);
  }

  function restart() {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment((prev) => ({
      ...prev,
      family: prev.initial ?? prev.family,
      initial: null,
      distances: [],
      n: 0,
    }));
    setNotice("反復の開始点へ戻しました。");
  }

  function changeRate(value: number) {
    setRate(value);
    restart();
    setNotice("同じ開始点から、新しいLで比較できます。");
  }

  function changeLayerCount(count: number) {
    setPlaying(false);
    setRepresentation("absent");
    setExperiment({
      ...resizeSystem(layers, family, count),
      initial: null,
      distances: [],
      n: 0,
    });
    setNotice("既存の層を保って層数を変更しました。");
  }

  function advance() {
    if (!result.coherent || n >= 200) {
      setPlaying(false);
      return;
    }
    const next = applyFeedback(layers, family, rate);
    const movement = familyDistance(layers, next, family);
    const nextDistance = familyDistance(layers, next, target);
    setExperiment((prev) => ({
      ...prev,
      family: next,
      initial: prev.initial ?? [...prev.family],
      n: prev.n + 1,
      distances: [
        ...(prev.distances.length ? prev.distances : [distance]),
        nextDistance,
      ],
    }));
    if (movement < 1e-9 || (rate < 1 && nextDistance < 1e-6) || n + 1 >= 200) {
      setPlaying(false);
      setNotice(
        n + 1 >= 200
          ? "200回で停止しました。開始点へ戻して比較できます。"
          : "変化が数値許容誤差に達したため、停止しました。",
      );
    }
  }

  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now();
    const tick = (time: number) => {
      if (time - last >= 600) {
        last = time;
        advanceRef.current();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function reset() {
    setPlaying(false);
    setExperiment(fresh());
    setRate(0.65);
    setRepresentation("absent");
  }

  return {
    experiment,
    rate,
    playing,
    representation,
    notice,
    result,
    target,
    distance,
    report,
    setPlaying,
    setRepresentation,
    setNotice,
    selectFamily,
    restart,
    changeRate,
    changeLayerCount,
    advance,
    reset,
  };
}
