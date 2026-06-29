import {
  Box,
  Stack,
  TextField,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import InfoOutlineSharpIcon from '@mui/icons-material/InfoOutlineSharp';
import KeySharpIcon from '@mui/icons-material/KeySharp';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

// 默认百智云 Chat 模型列表
const DEFAULT_BAIZHI_CLOUD_CHAT_MODELS: string[] = [
  'qwen-flash',
  'qwen3.5-flash',
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'qwen3.6-plus',
  'minimax-m2.7',
  'glm-5.1',
  'kimi-k2.6',
];

const getDefaultChatModel = (chatModel: string) => {
  if (DEFAULT_BAIZHI_CLOUD_CHAT_MODELS.includes(chatModel)) {
    return chatModel;
  }

  return DEFAULT_BAIZHI_CLOUD_CHAT_MODELS[0];
};

export interface AutoModelConfigRef {
  getFormData: () => {
    apiKey: string;
    selectedModel: string;
  };
}

interface AutoModelConfigProps {
  showTip?: boolean;
  initialApiKey?: string;
  initialChatModel?: string;
  showLegacyConfigTip?: boolean;
  onDataChange?: () => void;
}

const AutoModelConfig = forwardRef<AutoModelConfigRef, AutoModelConfigProps>(
  (props, ref) => {
    const {
      showTip = false,
      initialApiKey = '',
      initialChatModel = '',
      showLegacyConfigTip = false,
      onDataChange,
    } = props;
    const [autoConfigApiKey, setAutoConfigApiKey] = useState(initialApiKey);
    const [selectedAutoChatModel, setSelectedAutoChatModel] = useState(
      getDefaultChatModel(initialChatModel),
    );
    const [showApiKey, setShowApiKey] = useState(false);

    const modelList = DEFAULT_BAIZHI_CLOUD_CHAT_MODELS;

    // 当从父组件接收到新的初始值时，更新状态
    useEffect(() => {
      if (initialApiKey) {
        setAutoConfigApiKey(initialApiKey);
      }
    }, [initialApiKey]);

    useEffect(() => {
      setSelectedAutoChatModel(getDefaultChatModel(initialChatModel));
    }, [initialChatModel]);

    // 如果没有选中模型且有可用模型,默认选择第一个
    useEffect(() => {
      if (modelList.length && !selectedAutoChatModel) {
        setSelectedAutoChatModel(modelList[0]);
      }
    }, [modelList, selectedAutoChatModel]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      getFormData: () => ({
        apiKey: autoConfigApiKey,
        selectedModel: selectedAutoChatModel,
      }),
    }));

    return (
      <Stack
        sx={{
          flex: 1,
          p: 2,
          pl: 2,
          pr: 0,
          pt: 0,
          overflow: 'hidden',
          overflowY: 'auto',
        }}
      >
        <Box>
          {/* 提示信息 */}
          {showTip && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                mb: 2,
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(25, 118, 210, 0.2)',
              }}
            >
              <InfoOutlineSharpIcon
                sx={{
                  fontSize: 16,
                  color: 'primary.main',
                  flexShrink: 0,
                  mt: 0.2,
                }}
              />
              <Box
                sx={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'text.secondary',
                }}
              >
                通过 API Key 连接百智云提供平台后，PandaWiki
                会自动配置好系统所需的问答模型、向量模型、重排序模型、文档分析模型。充分利用平台配置，无需逐个手动配置。
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: '16px',
              pt: '32px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'text.primary',
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 10,
                  bgcolor: 'primary.main',
                  borderRadius: '30%',
                  mr: 1,
                }}
              />
              API Key
            </Box>
            <Box
              component='a'
              href='https://ai-models.app.baizhi.cloud/console/keys'
              target='_blank'
              sx={{
                color: 'primary.main',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <KeySharpIcon sx={{ fontSize: 14, color: 'primary.main' }} />
              获取百智云 API Key
            </Box>
          </Box>
          <TextField
            fullWidth
            size='medium'
            type={showApiKey ? 'text' : 'password'}
            value={autoConfigApiKey}
            onChange={e => {
              setAutoConfigApiKey(e.target.value);
              onDataChange?.();
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    size='small'
                    onClick={() => setShowApiKey(s => !s)}
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: '10px',
                height: '52px',
              },
            }}
          />
          {showLegacyConfigTip && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                mt: 1.5,
                bgcolor: 'rgba(237, 108, 2, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(237, 108, 2, 0.2)',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'warning.main',
              }}
            >
              <InfoOutlineSharpIcon
                sx={{
                  fontSize: 16,
                  color: 'warning.main',
                  flexShrink: 0,
                  mt: 0.2,
                }}
              />
              当前配置将于2026年12月31日失效，请及时前往模型商店更新 API Key。
            </Box>
          )}
        </Box>

        {!showTip && (
          <Box sx={{ mt: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'text.primary',
                mb: '16px',
                pt: '32px',
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 10,
                  bgcolor: 'primary.main',
                  borderRadius: '30%',
                  mr: 1,
                }}
              />
              模型选择
            </Box>
            <Stack direction='row' alignItems='center' gap={2}>
              <Box sx={{ fontSize: 12, color: 'text.secondary', minWidth: 80 }}>
                对话模型
              </Box>
              <Select
                size='medium'
                displayEmpty
                value={selectedAutoChatModel}
                onChange={e => {
                  setSelectedAutoChatModel(e.target.value as string);
                  onDataChange?.();
                }}
                sx={{
                  width: 300,
                  height: '52px',
                  '& .MuiInputBase-root': {
                    borderRadius: '10px',
                    bgcolor: '#F8F8FA',
                    height: '52px',
                  },
                  '& .MuiSelect-select': {
                    height: '52px',
                    lineHeight: '52px',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
                renderValue={sel =>
                  sel && (sel as string).length
                    ? (sel as string)
                    : '请选择聊天模型'
                }
              >
                {modelList.map((model: string) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Box>
        )}
      </Stack>
    );
  },
);

export default AutoModelConfig;
