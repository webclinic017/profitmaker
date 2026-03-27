import { z } from 'zod';

// Available group colors
export const GroupColors = [
  'transparent', // no group
  '#00BCD4', // cyan
  '#F44336', // red  
  '#9C27B0', // purple
  '#2196F3', // blue
  '#4CAF50', // green
  '#FF9800', // orange
  '#E91E63', // pink
] as const;

export type GroupColor = typeof GroupColors[number];

// Group schema
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(GroupColors),
  tradingPair: z.string().optional(), // trading pair for display instead of color
  account: z.string().optional(), // account email
  exchange: z.string().optional(), // exchange name
  market: z.string().optional(), // market type (spot, futures, etc.)
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Group = z.infer<typeof GroupSchema>;

// Types for creating and updating groups
export type CreateGroupData = Omit<Group, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateGroupData = Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt'>>;

// GroupStore state schema
export const GroupStoreStateSchema = z.object({
  groups: z.array(GroupSchema),
  selectedGroupId: z.string().optional(),
});

export type GroupStoreState = z.infer<typeof GroupStoreStateSchema>; 