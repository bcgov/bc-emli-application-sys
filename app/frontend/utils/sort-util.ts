export type SortDirection = 'asc' | 'desc';

export class SortUtil {
  /**
   * Sorts an array of objects by a given field.
   * Supports strings, numbers (including epoch timestamps), nulls.
   */
  static applySortToArray<T>(array: T[], field: keyof T, direction: SortDirection): T[] {
    return array.slice().sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      // Handle null/undefined values first
      if (aVal == null && bVal != null) return direction === 'asc' ? -1 : 1;
      if (aVal != null && bVal == null) return direction === 'asc' ? 1 : -1;
      if (aVal == null && bVal == null) return 0;

      // Assume values are comparable as-is (number, string, etc)
      if (aVal === bVal) return 0;
      return direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
  }
}
