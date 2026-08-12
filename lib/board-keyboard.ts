export type BoardColumn = { status: string; jobIds: string[] };
export type FocusDirection = "up" | "down" | "left" | "right";

export function computeNextFocusedJob(
  columns: BoardColumn[],
  currentJobId: string | null,
  direction: FocusDirection
): string | null {
  const firstNonEmpty = columns.find((c) => c.jobIds.length > 0);
  if (!firstNonEmpty) return null;

  const colIndex = columns.findIndex((c) => c.jobIds.includes(currentJobId ?? ""));
  if (colIndex === -1) {
    return firstNonEmpty.jobIds[0];
  }
  const rowIndex = columns[colIndex].jobIds.indexOf(currentJobId as string);

  if (direction === "up") {
    return rowIndex > 0
      ? columns[colIndex].jobIds[rowIndex - 1]
      : (currentJobId as string);
  }
  if (direction === "down") {
    return rowIndex < columns[colIndex].jobIds.length - 1
      ? columns[colIndex].jobIds[rowIndex + 1]
      : (currentJobId as string);
  }

  const step = direction === "left" ? -1 : 1;
  let nextCol = colIndex + step;
  while (nextCol >= 0 && nextCol < columns.length) {
    if (columns[nextCol].jobIds.length > 0) {
      const targetRow = Math.min(rowIndex, columns[nextCol].jobIds.length - 1);
      return columns[nextCol].jobIds[targetRow];
    }
    nextCol += step;
  }
  return currentJobId as string;
}

export function adjacentStatus(
  order: string[],
  current: string,
  direction: "prev" | "next"
): string | null {
  const index = order.indexOf(current);
  if (index === -1) return null;
  const targetIndex = direction === "next" ? index + 1 : index - 1;
  if (targetIndex < 0 || targetIndex >= order.length) return null;
  return order[targetIndex];
}
