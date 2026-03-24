// Returns quick prompts for a given entry slot, rotating daily
// Rules:
// - Slot 0 always starts with "i'm grateful for..." and always includes "only_20"
// - Slot 1 always starts with "here's a rec..."
// - Slots 0/1/2 use non-overlapping rotating prompt sets
// - "custom" is always the last quick prompt
// - "more options" is rendered in the UI as the 5th button
export function getDailyPrompts(allPrompts: import("./data").Prompt[], slotIndex: number = 0): import("./data").Prompt[] {
  const custom = allPrompts.find((p) => p.id === "custom");
  const grateful = allPrompts.find((p) => p.id === "grateful");
  const only20 = allPrompts.find((p) => p.id === "only_20");
  const recommend = allPrompts.find((p) => p.id === "recommend");

  // Pool excludes explicitly placed prompts
  const quickListPool = allPrompts.filter(
    (p) => p.id !== "custom" && p.id !== "recommend" && p.id !== "grateful" && p.id !== "only_20",
  );

  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const shuffled = [...quickListPool].sort((a, b) => {
    const ha = hashStr(`${a.id}-${daySeed}`);
    const hb = hashStr(`${b.id}-${daySeed}`);
    return ha - hb;
  });

  // Build non-overlapping chunks so slots differ from each other
  // Slot 0: grateful + only_20 + 1 rotating + custom = 4 quick prompts
  // Slot 1: recommend + 2 rotating + custom = 4
  // Slot 2: 3 rotating + custom = 4
  const slot0Others = shuffled.slice(0, 1);
  const slot1Others = shuffled.slice(1, 3);
  const slot2Prompts = shuffled.slice(3, 6);

  if (slotIndex === 0) {
    return [grateful, only20, ...slot0Others, custom].filter(Boolean) as import("./data").Prompt[];
  }

  if (slotIndex === 1) {
    return [recommend, ...slot1Others, custom].filter(Boolean) as import("./data").Prompt[];
  }

  return [...slot2Prompts, custom].filter(Boolean) as import("./data").Prompt[];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}
