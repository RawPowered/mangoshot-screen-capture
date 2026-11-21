/* MangoShot clip edit decision list: immutable and deterministic, seconds. */
(function (root) {
  const EPS = 1e-6;
  const finite = n => Number.isFinite(n);
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function range(start, end, duration) {
    if (!finite(duration) || duration <= 0) throw new Error('Video duration is unavailable.');
    if (!finite(start) || !finite(end)) throw new Error('Invalid selection.');
    const a = clamp(start, 0, duration), b = clamp(end, 0, duration);
    if (b - a < 0.04) throw new Error('Select at least 0.04 seconds.');
    return { start: a, end: b };
  }
  function normalize(items, duration) {
    if (!Array.isArray(items)) throw new Error('Invalid clip timeline.');
    const ranges = items.map(x => range(x.start, x.end, duration)).sort((a, b) => a.start - b.start);
    const result = [];
    for (const r of ranges) {
      const last = result[result.length - 1];
      if (last && r.start <= last.end + EPS) last.end = Math.max(last.end, r.end);
      else result.push({ ...r });
    }
    return result;
  }
  function remove(items, cut, duration) {
    const c = range(cut.start, cut.end, duration);
    const out = [];
    for (const s of normalize(items, duration)) {
      if (c.end <= s.start || c.start >= s.end) { out.push(s); continue; }
      if (c.start - s.start >= 0.04) out.push({start:s.start,end:Math.min(c.start,s.end)});
      if (s.end - c.end >= 0.04) out.push({start:Math.max(c.end,s.start),end:s.end});
    }
    return normalize(out, duration);
  }
  function trim(items, selection, duration) {
    const keep = range(selection.start, selection.end, duration);
    return normalize(items.flatMap(s => {
      const a = Math.max(s.start, keep.start), b = Math.min(s.end, keep.end);
      return b - a >= 0.04 ? [{start:a,end:b}]:[];
    }), duration);
  }
  function outputDuration(items) { return items.reduce((sum, seg) => sum + seg.end - seg.start, 0); }
  function sourceAt(items, outputTime) {
    if (!finite(outputTime)) throw new Error('Invalid playback time.');
    let cursor = 0;
    for (const seg of items) {
      const len = seg.end - seg.start;
      if (outputTime < cursor + len) return seg.start + Math.max(0, outputTime - cursor);
      cursor += len;
    }
    return items.length ? items[items.length - 1].end : 0;
  }
  root.MangoTimeline = {range, normalize, remove, trim, outputDuration, sourceAt};
})(typeof globalThis !== 'undefined' ? globalThis : this);
