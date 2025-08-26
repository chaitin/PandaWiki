import SSEClient from '@/utils/fetch';
import { Box, Divider, Stack } from '@mui/material';
import { Editor, useTiptap, UseTiptapReturn } from '@yu-cq/tiptap';
import { Modal } from 'ct-mui';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AIGenerateProps {
  open: boolean;
  selectText: string;
  onClose: () => void;
  editorRef: UseTiptapReturn;
}

const AIGenerate = ({
  open,
  selectText,
  onClose,
  editorRef,
}: AIGenerateProps) => {
  const sseClientRef = useRef<SSEClient<string> | null>(null);

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const defaultEditor = useTiptap({
    editable: false,
  });

  const readEditor = useTiptap({
    editable: false,
  });

  const onGenerate = useCallback(() => {
    if (sseClientRef.current) {
      setLoading(true);
      sseClientRef.current.subscribe(
        JSON.stringify({
          text: selectText,
          action: 'rephrase',
          stream: true,
        }),
        data => {
          setContent(prev => {
            const newContent = prev + data;
            readEditor.editor?.commands.setContent(newContent);
            return newContent;
          });
        },
      );
    }
  }, [selectText, sseClientRef.current, readEditor.editor]);

  const onCancel = () => {
    sseClientRef.current?.unsubscribe();
    defaultEditor.editor.commands.setContent('');
    readEditor.editor.commands.setContent('');
    setContent('');
    onClose();
  };

  const onSubmit = () => {
    const { from, to } = editorRef.editor.state.selection;
    editorRef.editor.commands.insertContentAt({ from, to }, content);
    onCancel();
  };

  useEffect(() => {
    if (!open) return;
    sseClientRef.current = new SSEClient<string>({
      url: '/api/v1/creation/text',
      headers: {
        'Content-Type': 'application/json',
      },
      onComplete: () => setLoading(false),
      onError: () => setLoading(false),
    });
    if (selectText) {
      defaultEditor.editor.commands.setContent(selectText);
      setTimeout(() => {
        onGenerate();
      }, 60);
    }
  }, [selectText, open]);

  useEffect(() => {
    return () => {
      defaultEditor.editor.destroy();
      readEditor.editor.destroy();
      sseClientRef.current?.unsubscribe();
    };
  }, []);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={'文本润色'}
      okText='替换'
      width={1000}
      onOk={onSubmit}
      okButtonProps={{
        loading,
        disabled: content.length === 0,
      }}
    >
      <Stack
        direction={'row'}
        sx={{
          '.tiptap.ProseMirror': {
            padding: '0px',
          },
        }}
      >
        <Stack
          sx={{
            width: '50%',
            flex: 1,
          }}
        >
          <Box
            sx={{
              mb: 0.5,
              ml: 1,
              fontSize: 14,
              fontWeight: 'bold',
              color: 'text.auxiliary',
            }}
          >
            原文
          </Box>
          <Box
            sx={{
              borderRadius: '10px',
              p: 2,
              bgcolor: 'background.paper2',
              flex: 1,
            }}
          >
            <Editor editor={defaultEditor.editor} />
          </Box>
        </Stack>
        <Divider orientation='vertical' flexItem sx={{ mx: 2 }} />
        <Stack sx={{ width: '50%', flex: 1 }}>
          <Box
            sx={{
              mb: 0.5,
              ml: 1,
              fontSize: 14,
              fontWeight: 'bold',
              color: 'text.auxiliary',
            }}
          >
            润色后
          </Box>
          <Box
            sx={{
              borderRadius: '10px',
              p: 2,
              bgcolor: 'background.paper2',
              flex: 1,
            }}
          >
            <Editor editor={readEditor.editor} />
          </Box>
        </Stack>
      </Stack>
    </Modal>
  );
};

export default AIGenerate;
