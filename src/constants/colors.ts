export const APP_COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E05520',
  background: '#FFF8F5',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF0EA',
  text: '#1A0A00',
  textMuted: '#8A6A5A',
  textLight: '#C4A090',
  border: '#F0DDD5',
  lost: '#E53E3E',
  lostLight: '#FFF5F5',
  lostBorder: '#FC8181',
  found: '#38A169',
  foundLight: '#F0FFF4',
  foundBorder: '#68D391',
  placeholder: '#BBA090',
  shadow: 'rgba(255, 107, 53, 0.15)',
} as const;

export const LOST_FORM_COLORS = {
  ...APP_COLORS,
  borderFocus: '#FF6B35',
} as const;

export const FOUND_FORM_COLORS = {
  primary: APP_COLORS.primary,
  primaryLight: APP_COLORS.primaryLight,
  primaryDark: APP_COLORS.primaryDark,
  background: '#F0FFF4',
  surface: '#FFFFFF',
  surfaceAlt: '#F0FFF4',
  text: '#0A1A00',
  textMuted: '#4A6A5A',
  textLight: '#90C4A0',
  border: '#C6E8D0',
  borderFocus: '#38A169',
  lost: APP_COLORS.lost,
  lostLight: APP_COLORS.lostLight,
  lostBorder: APP_COLORS.lostBorder,
  found: APP_COLORS.found,
  foundLight: APP_COLORS.foundLight,
  foundBorder: APP_COLORS.foundBorder,
  placeholder: '#90C4A0',
  shadow: APP_COLORS.shadow,
} as const;

export const SHARED_STATUS_COLORS = {
  infoBackground: '#EFF6FF',
  infoText: '#1D4ED8',
  warningBackground: '#FFFBEB',
  warningText: '#92400E',
} as const;
