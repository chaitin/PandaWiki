import { useAppSelector } from '@/store';
import { Box, Stack, Typography } from '@mui/material';
import { ThemeProvider } from 'ct-mui';
import { light, dark } from '@/themes/color';
import { Component, Dispatch, SetStateAction, useMemo } from 'react';
import { AppSetting } from '@/api';
import Header from './Header';
import componentStyleOverrides from '@/themes/override';

interface ShowContentProps {
  curComponent: string;
  setCurComponent: Dispatch<SetStateAction<string>>;
}

const ShowContent = ({ setCurComponent, curComponent }: ShowContentProps) => {
  const { appPreviewData } = useAppSelector((state) => state.config);

  const settings: Partial<AppSetting> = useMemo(() => {
    return (
      appPreviewData?.settings || {
        title: '默认标题',
        icon: '',
        btns: [],
        header_search_placeholder: '',
      }
    );
  }, [appPreviewData]);

  // 渲染带高亮边框的组件
  const renderHighlightedComponent = (
    componentName: string,
    component: React.ReactNode
  ) => {
    const isHighlighted = curComponent === componentName;

    return (
      <Box
        sx={{
          position: 'relative',
          border: isHighlighted ? '2px solid #5F58FE' : '2px solid transparent',
          borderRadius: '4px',
          padding: '2px',
          cursor: 'pointer',
          '&:hover': {
            border: isHighlighted ? '2px solid #5F58FE' : '2px dashed #5F58FE',
          },
        }}
        // 添加自定义属性用于标识组件
        data-component={componentName}
        onClick={(e) => {
          setCurComponent(componentName);
        }}
      >
        {component}
        {isHighlighted && (
          <Typography
            sx={{
              position: 'absolute',
              left: '-2px',
              bottom: '-24px',
              fontWeight: 400,
              lineHeight: '22px',
              bgcolor: '#5F58FE',
              color: '#FFFFFF',
              fontSize: '14px',
              padding: '1px 16px',
            }}
          >
            {componentName}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Stack
      sx={{
        flexGrow: 1,
        height: 'calc(100%-20px)',
        marginTop: '20px',
        minWidth: 0,
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #ECEEF1',
        borderLeft: '1px solid #ECEEF1',
        borderTop: '1px solid #ECEEF1',
      }}
    >
      {/* Header预览部分 */}
      {renderHighlightedComponent('header', <Header settings={settings} />)}
    </Stack>
  );
};

export default ShowContent;
