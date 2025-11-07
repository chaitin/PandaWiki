'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  Stack,
  TextField,
  styled,
  alpha,
} from '@mui/material';

// 布局容器组件
export const StyledMainContainer = styled(Box)(() => ({
  flex: 1,
}));

export const StyledConversationContainer = styled(Stack)(() => ({
  maxHeight: 'calc(100vh - 332px)',
  overflow: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}));

export const StyledConversationItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

// 聊天气泡相关组件
export const StyledUserBubble = styled(Box)(({ theme }) => ({
  alignSelf: 'flex-end',
  maxWidth: '75%',
  padding: theme.spacing(1, 2),
  borderRadius: '10px 10px 0px 10px',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: 14,
  wordBreak: 'break-word',
}));

export const StyledAiBubble = styled(Box)(({ theme }) => ({
  alignSelf: 'flex-start',
  maxWidth: '85%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

export const StyledAiBubbleContent = styled(Box)(() => ({
  wordBreak: 'break-word',
}));

// 对话相关组件
export const StyledAccordion = styled(Accordion)(() => ({
  padding: 0,
  border: 'none',
  '&:before': {
    content: '""',
    height: 0,
  },
  background: 'transparent',
  backgroundImage: 'none',
}));

export const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  userSelect: 'text',
  borderRadius: '10px',
  backgroundColor: theme.palette.background.paper3,
  border: '1px solid',
  borderColor: theme.palette.divider,
}));

export const StyledAccordionDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: 'none',
}));

export const StyledQuestionText = styled(Box)(() => ({
  fontWeight: '700',
  fontSize: 16,
  lineHeight: '24px',
  wordBreak: 'break-all',
}));

// 搜索结果相关组件
export const StyledChunkAccordion = styled(Accordion)(({ theme }) => ({
  backgroundImage: 'none',
  background: 'transparent',
  border: 'none',
  padding: 0,
}));

export const StyledChunkAccordionSummary = styled(AccordionSummary)(
  ({ theme }) => ({
    justifyContent: 'flex-start',
    gap: theme.spacing(2),
    '.MuiAccordionSummary-content': {
      flexGrow: 0,
    },
  }),
);

export const StyledChunkAccordionDetails = styled(AccordionDetails)(
  ({ theme }) => ({
    paddingTop: 0,
    paddingLeft: theme.spacing(2),
    borderTop: 'none',
    borderLeft: '1px solid',
    borderColor: theme.palette.divider,
  }),
);

export const StyledChunkItem = styled(Box)(({ theme }) => ({
  cursor: 'pointer',
  '&:hover': {
    '.hover-primary': {
      color: theme.palette.primary.main,
    },
  },
}));

// 思考过程相关组件
export const StyledThinkingAccordion = styled(Accordion)(({ theme }) => ({
  backgroundColor: 'transparent',
  border: 'none',
  padding: 0,
  paddingBottom: theme.spacing(2),
  '&:before': {
    content: '""',
    height: 0,
  },
}));

export const StyledThinkingAccordionSummary = styled(AccordionSummary)(
  ({ theme }) => ({
    justifyContent: 'flex-start',
    gap: theme.spacing(2),
    '.MuiAccordionSummary-content': {
      flexGrow: 0,
    },
  }),
);

export const StyledThinkingAccordionDetails = styled(AccordionDetails)(
  ({ theme }) => ({
    paddingTop: 0,
    paddingLeft: theme.spacing(2),
    borderTop: 'none',
    borderLeft: '1px solid',
    borderColor: theme.palette.divider,
    '.markdown-body': {
      opacity: 0.75,
      fontSize: 12,
    },
  }),
);

// 操作区域组件
export const StyledActionStack = styled(Stack)(({ theme }) => ({
  fontSize: 12,
  color: alpha(theme.palette.text.primary, 0.35),
}));

// 输入区域组件
export const StyledInputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}));

export const StyledInputWrapper = styled(Stack)(({ theme }) => ({
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderRadius: '10px',
  border: '1px solid',
  borderColor: alpha(theme.palette.text.primary, 0.1),
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  boxShadow: `0px 20px 40px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
  transition: 'border-color 0.2s ease-in-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

// 图片预览组件
export const StyledImagePreviewStack = styled(Stack)(() => ({
  width: '100%',
  zIndex: 1,
}));

export const StyledImagePreviewItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid',
  borderColor: theme.palette.divider,
}));

export const StyledImageRemoveButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: 2,
  right: 2,
  width: 16,
  height: 16,
  backgroundColor: theme.palette.background.paper,
  border: '1px solid',
  borderColor: theme.palette.divider,
  transition: 'opacity 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.background.paper,
  },
}));

// 输入框组件
export const StyledTextField = styled(TextField)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  '.MuiInputBase-root': {
    padding: 0,
    overflow: 'hidden',
    height: '52px !important',
  },
  textarea: {
    borderRadius: 0,
    '&::-webkit-scrollbar': {
      display: 'none',
    },
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    padding: '2px',
  },
  fieldset: {
    border: 'none',
  },
}));

// 操作按钮组件
export const StyledActionButtonStack = styled(Stack)(() => ({
  width: '100%',
}));

// 搜索建议组件
export const StyledFuzzySuggestionsStack = styled(Stack)(({ theme }) => ({
  marginTop: theme.spacing(1),
  position: 'relative',
  zIndex: 1000,
}));

export const StyledFuzzySuggestionItem = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  display: 'flex',
  alignItems: 'center',
  width: 'auto',
  fontSize: 14,
  fontWeight: 400,
}));

// 热门搜索组件
export const StyledHotSearchStack = styled(Stack)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const StyledHotSearchItem = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(0.75),
  paddingBottom: theme.spacing(0.75),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  marginBottom: theme.spacing(1),
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: alpha(theme.palette.text.primary, 0.02),
  border: `1px solid ${alpha(theme.palette.text.primary, 0.01)}`,
  color: alpha(theme.palette.text.primary, 0.75),
  '&:hover': {
    color: theme.palette.primary.main,
  },
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  width: 'auto',
}));

// 热门搜索容器
export const StyledHotSearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
}));

// 热门搜索列
export const StyledHotSearchColumn = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  paddingLeft: theme.spacing(2),
  borderLeft: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
}));

// 热门搜索列项目
export const StyledHotSearchColumnItem = styled(Box)(({ theme }) => ({
  paddingRight: theme.spacing(2),
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: 'transparent',
  color: theme.palette.text.secondary,
  fontSize: 12,
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  '&:hover': {
    color: theme.palette.primary.main,
  },
}));
