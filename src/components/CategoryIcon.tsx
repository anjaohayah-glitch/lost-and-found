import { Ionicons } from '@expo/vector-icons';

import { getCategoryIcon } from '../constants/categories';
import { APP_COLORS } from '../constants/colors';

interface CategoryIconProps {
  category: string;
  color?: string;
  size?: number;
}

export default function CategoryIcon({
  category,
  color = APP_COLORS.primary,
  size = 28,
}: CategoryIconProps) {
  return <Ionicons name={getCategoryIcon(category)} size={size} color={color} />;
}
