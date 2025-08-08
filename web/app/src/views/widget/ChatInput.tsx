import { IconArrowUp } from '@/components/icons';
import { useStore } from '@/provider';
import { Box, IconButton, TextField } from '@mui/material';
import { useState } from 'react';
import ChatLoading from '../chat/ChatLoading';
import { AnswerStatus } from '../chat/constant';

interface ChatInputProps {
  loading: boolean;
  thinking: keyof typeof AnswerStatus;
  onSearch: (input: string) => void;
  handleSearchAbort: () => void;
  setThinking: (thinking: keyof typeof AnswerStatus) => void;
  placeholder: string;
}

const ChatInput = ({
  loading,
  onSearch,
  thinking,
  setThinking,
  handleSearchAbort,
  placeholder,
}: ChatInputProps) => {
  const { themeMode } = useStore();
  const [input, setInput] = useState('');

  const handleSearch = () => {
    if (input.length > 0) {
      onSearch(input);
      setInput('');
    }
  };

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor:
          themeMode === 'dark' ? 'background.paper' : 'background.default',
        p: 2,
      }}
    >
      <TextField
        fullWidth
        multiline
        rows={2}
        disabled={loading}
        sx={{
          '.MuiInputBase-root': {
            p: 0,
            overflow: 'hidden',
            height: '52px !important',
            transition: 'all 0.5s ease-in-out',
            bgcolor:
              themeMode === 'dark' ? 'background.paper' : 'background.default',
          },
          textarea: {
            lineHeight: '26px',
            height: '52px !important',
            borderRadius: 0,
            transition: 'all 0.5s ease-in-out',
            '&::placeholder': {
              fontSize: 14,
            },
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          fieldset: {
            border: 'none',
          },
        }}
        size='small'
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          const isComposing =
            e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
          if (
            e.key === 'Enter' &&
            !e.shiftKey &&
            input.length > 0 &&
            !isComposing
          ) {
            e.preventDefault();
            handleSearch();
          }
        }}
        placeholder={placeholder}
        autoComplete='off'
        slotProps={{
          input: {
            sx: {
              gap: 2,
              alignItems: loading ? 'flex-start' : 'flex-end',
              mr: loading ? 10 : 4,
            },
            endAdornment: (
              <Box
                sx={{
                  fontSize: 12,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                {loading ? (
                  <ChatLoading
                    thinking={thinking}
                    onClick={() => {
                      setThinking(4);
                      handleSearchAbort();
                    }}
                  />
                ) : (
                  <IconButton
                    size='small'
                    onClick={() => {
                      if (input.length > 0) {
                        handleSearchAbort();
                        setThinking(1);
                        handleSearch();
                      }
                    }}
                  >
                    <IconArrowUp sx={{ fontSize: 12 }} />
                  </IconButton>
                )}
              </Box>
            ),
          },
        }}
      />
    </Box>
  );
};

export default ChatInput;