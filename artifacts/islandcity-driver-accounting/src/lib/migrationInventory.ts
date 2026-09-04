export type InventoryScope = 'user' | 'global' | 'legacy' | 'examples' | 'unclassified';

export interface InventoryGroup {
  id: string;
  name: string;
  scope: InventoryScope;
  count: number;
  exampleCount?: number;
  sampleRecords?: { id: string; label: string; amount: number }[];
  notes?: string[];
}

export interface InventoryReport {
  groups: InventoryGroup[];
  totalRecords: number;
  generatedAt: string;
  warnings?: string[];
}

export function buildLocalInventory(): InventoryReport {
  return { groups: [], totalRecords: 0, generatedAt: new Date().toISOString() };
}

export function inventoryManifestJson(): string {
  return JSON.stringify({ version: '1.0', groups: [] });
}
