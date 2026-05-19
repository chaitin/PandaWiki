import { IconButton, alpha } from '@mui/material';
import { IconShensemoshi, IconMingliangmoshi } from '@panda-wiki/icons';
import { useThemeStore } from '@/provider/themeStore';

const ThemeSwitch = () => {
  const { themeMode, setThemeMode } = useThemeStore();
  return (
    <IconButton
      size='small'
      onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
    >
      {themeMode === 'dark' ? (
        <IconShensemoshi
          sx={(theme: import('@mui/material/styles').Theme) => ({
            color: alpha(theme.palette.text.primary, 0.65),
          })}
        />
      ) : (
        <IconMingliangmoshi sx={{ fontSize: 20 }} />
      )}
    </IconButton>
  );
};

export default ThemeSwitch;
