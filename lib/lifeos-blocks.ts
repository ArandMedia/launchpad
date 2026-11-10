export const BLOCK_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

export type TimeBlock = {
  id: string;
  title: string;
  note: string;
  category: string;
  status: BlockStatus;
  startAt: string;
  endAt: string;
  objectiveId: string | null;
};

export type PositionedBlock = TimeBlock & { column: number; columnCount: number };

export function positionOverlappingBlocks(blocks: TimeBlock[]): PositionedBlock[] {
  const sorted = [...blocks].sort((a, b) => new Date(a.startAt).valueOf() - new Date(b.startAt).valueOf());
  const result: PositionedBlock[] = [];
  let group: TimeBlock[] = [];
  let groupEnd = -Infinity;

  function placeGroup() {
    if (!group.length) return;
    const columns: number[] = [];
    const placements = group.map((block) => {
      const start = new Date(block.startAt).valueOf();
      let column = columns.findIndex((end) => end <= start);
      if (column < 0) column = columns.length;
      columns[column] = new Date(block.endAt).valueOf();
      return { block, column };
    });
    const columnCount = Math.max(1, columns.length);
    result.push(...placements.map(({ block, column }) => ({ ...block, column, columnCount })));
    group = [];
  }

  for (const block of sorted) {
    const start = new Date(block.startAt).valueOf();
    if (group.length && start >= groupEnd) placeGroup();
    group.push(block);
    groupEnd = Math.max(groupEnd, new Date(block.endAt).valueOf());
    if (group.length === 1) groupEnd = new Date(block.endAt).valueOf();
  }
  placeGroup();
  return result;
}

export function agendaFor(blocks: TimeBlock[], now: Date, isToday: boolean) {
  const sorted = [...blocks].sort((a, b) => new Date(a.startAt).valueOf() - new Date(b.startAt).valueOf());
  return {
    sorted,
    happeningNow: isToday
      ? sorted.filter((block) => new Date(block.startAt) <= now && new Date(block.endAt) > now && !["COMPLETED", "SKIPPED"].includes(block.status))
      : [],
    upNext: isToday
      ? sorted.find((block) => new Date(block.startAt) > now && !["COMPLETED", "SKIPPED"].includes(block.status)) ?? null
      : sorted.find((block) => !["COMPLETED", "SKIPPED"].includes(block.status)) ?? null,
    remaining: isToday ? sorted.filter((block) => new Date(block.endAt) > now) : sorted,
  };
}
