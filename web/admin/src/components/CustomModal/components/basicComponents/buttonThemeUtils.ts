/**
 * 根据主题模式和按钮变体生成相应的样式
 * @param themeMode 主题模式 ('light' | 'dark')
 * @param variant 按钮变体 ('contained' | 'outlined' | 'text')
 * @returns 返回相应的按钮样式对象
 */
export const getButtonThemeStyle = (
  themeMode: 'light' | 'dark' | undefined,
  variant: string,
) => {
  // 只在dark主题下应用特殊样式
  if (themeMode === 'dark') {
    switch (variant) {
      case 'contained':
        return {
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderColor: 'primary.main',
          '&:hover': {
            bgcolor: 'primary.dark',
            borderColor: 'primary.dark',
          },
        };
      case 'outlined':
        return {
          borderColor: 'primary.main',
          color: 'primary.main',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
        };
      case 'text':
        return {
          color: 'primary.main',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        };
      default:
        return {};
    }
  }
  if (themeMode === 'light') {
    switch (variant) {
      case 'text':
        return {
          color: 'text.primary',
        };
    }
  }
  return {};
};

export default getButtonThemeStyle;
