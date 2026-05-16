export const APP_COLORS = {
  primary: '#F0642F',
  primaryLight: '#FF8A5C',
  primaryDark: '#C94A1A',
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF3EC',
  text: '#182230',
  textMuted: '#667085',
  textLight: '#98A2B3',
  border: '#E4E7EC',
  lost: '#D92D20',
  lostLight: '#FEF3F2',
  lostBorder: '#FDA29B',
  found: '#079455',
  foundLight: '#ECFDF3',
  foundBorder: '#86EFAC',
  placeholder: '#98A2B3',
  shadow: 'rgba(16, 24, 40, 0.10)',
  ink: '#101828',
  accent: '#2563EB',
  accentLight: '#EFF6FF',
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
