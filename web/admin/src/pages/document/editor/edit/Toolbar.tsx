import { Box } from '@mui/material';
import { AiGenerate2Icon, EditorToolbar, UseTiptapReturn } from '@yu-cq/tiptap';

interface ToolbarProps {
  editorRef: UseTiptapReturn;
  handleAiGenerate?: () => void;
}

const Toolbar = ({ editorRef, handleAiGenerate }: ToolbarProps) => {
  return (
    <Box
      sx={{
        width: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.default',
        px: 0.5,
        mx: 1,
        boxShadow: 1,
      }}
    >
      <EditorToolbar
        editor={editorRef.editor}
        menuInToolbarMore={[
          {
            id: 'ai',
            label: '文本润色',
            icon: <AiGenerate2Icon sx={{ fontSize: '1rem' }} />,
            onClick: handleAiGenerate,
          },
        ]}
      />
    </Box>
  );
};

export default Toolbar;
