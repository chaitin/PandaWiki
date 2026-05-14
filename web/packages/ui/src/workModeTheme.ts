import { createTheme, type Theme } from '@mui/material';

/**
 * 工作模式调色板（淘宝风格：橙红主色 + 浅暖底）
 * 与培训模式的 KB 自定义主色形成强对比，但仍是浅色系，整体不刺眼。
 */
export const WORK_MODE_PALETTE = {
  bgDeep: '#fff5f0', // 主背景：浅暖橙底（淘宝那种暖白）
  bgMid: '#fffaf6', // 副背景
  bgRaised: '#ffffff', // 提升层
  border: 'rgba(255, 68, 0, 0.18)',
  borderStrong: 'rgba(255, 68, 0, 0.42)',
  borderSoft: 'rgba(255, 68, 0, 0.1)',
  accentPrimary: '#ff4400', // 淘宝主色橙红
  accentBright: '#ff6a00', // 高亮橙
  accentDeep: '#cc3300', // 深橙红（用于 hover/contrast）
  textPrimary: '#1f1612', // 暖调深灰，配合橙系更协调
  textSecondary: 'rgba(31, 22, 18, 0.7)',
  textMuted: 'rgba(31, 22, 18, 0.5)',
  shadow:
    '0 12px 36px rgba(255, 68, 0, 0.12), 0 0 0 1px rgba(255, 68, 0, 0.06)',
  switchTrack: 'rgba(255, 68, 0, 0.32)',
} as const;

/** 创建淘宝橙子主题：让 work 模式下 theme.palette.primary/bg/text 等同步变化 */
export function buildWorkModeTheme(parent: Theme): Theme {
  return createTheme({
    ...parent,
    palette: {
      ...parent.palette,
      mode: 'light',
      primary: {
        ...parent.palette.primary,
        main: WORK_MODE_PALETTE.accentPrimary,
        light: WORK_MODE_PALETTE.accentBright,
        dark: WORK_MODE_PALETTE.accentDeep,
        contrastText: '#ffffff',
      },
      background: {
        ...parent.palette.background,
        default: WORK_MODE_PALETTE.bgDeep,
        paper: WORK_MODE_PALETTE.bgRaised,
      },
      text: {
        ...parent.palette.text,
        primary: WORK_MODE_PALETTE.textPrimary,
        secondary: WORK_MODE_PALETTE.textSecondary,
        disabled: WORK_MODE_PALETTE.textMuted,
      },
      divider: WORK_MODE_PALETTE.border,
    },
  });
}
