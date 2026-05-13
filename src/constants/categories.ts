import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryOption {
  label: string;
  value: string;
  icon: AppIconName;
}

export const CATEGORIES: CategoryOption[] = [
  { label: 'Bag / Backpack', value: 'bag', icon: 'bag-handle-outline' },
  { label: 'Phone / Gadget', value: 'gadget', icon: 'phone-portrait-outline' },
  { label: 'Glasses / Accessories', value: 'accessories', icon: 'glasses-outline' },
  { label: 'Documents / ID', value: 'documents', icon: 'document-text-outline' },
  { label: 'Keys', value: 'keys', icon: 'key-outline' },
  { label: 'Clothing', value: 'clothing', icon: 'shirt-outline' },
  { label: 'Wallet / Money', value: 'wallet', icon: 'wallet-outline' },
  { label: 'Books / Notebooks', value: 'books', icon: 'book-outline' },
  { label: 'School Supplies', value: 'school', icon: 'school-outline' },
  { label: 'Other', value: 'other', icon: 'cube-outline' },
];

export const CATEGORY_ICONS: Record<string, AppIconName> = CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.icon }),
  {} as Record<string, AppIconName>,
);

export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((item) => item.value === category)?.label ?? 'Other';
}

export function getCategoryIcon(category: string): AppIconName {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
}
