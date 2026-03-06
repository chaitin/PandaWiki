import { DocWidth } from '@/constant';
import type { SxProps, Theme } from '@mui/material';

export interface GetDocContentSxOptions {
  docWidth: string;
  mobile: boolean;
  catalogWidth: number;
  /** error 变体用于错误状态展示，使用不同的 maxWidth 计算 */
  variant?: 'normal' | 'error';
}

export function getDocContentSx(
  options: GetDocContentSxOptions,
): SxProps<Theme> {
  const { docWidth, mobile, catalogWidth, variant = 'normal' } = options;

  return {
    ...(docWidth === 'full' &&
      !mobile && {
        flexGrow: 1,
        ...(variant === 'normal' && { width: 0 }),
      }),
    ...(docWidth !== 'full' &&
      !mobile && {
        width:
          variant === 'error'
            ? DocWidth[docWidth as keyof typeof DocWidth].value + 336
            : DocWidth[docWidth as keyof typeof DocWidth].value,
        maxWidth:
          variant === 'error'
            ? `calc(100% - ${catalogWidth}px - 96px)`
            : `calc(100% - ${catalogWidth}px - 240px - 192px)`,
      }),
    ...(mobile && {
      mx: 'auto',
      marginTop: 3,
      width: '100%',
      px: 3,
    }),
  };
}
