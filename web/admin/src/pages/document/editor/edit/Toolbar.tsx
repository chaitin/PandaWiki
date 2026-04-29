import {
  AiGenerate2Icon,
  EditorToolbar,
  UseTiptapReturn,
} from '@ctzhian/tiptap';
import { Box } from '@mui/material';
import { IconTianjiawendang } from '@panda-wiki/icons';

interface ToolbarProps {
  editorRef: UseTiptapReturn;
  handleAiGenerate?: () => void;
  /** 从知识库已有文档快速插入链接 */
  onInsertKbDocLink?: () => void;
}

const Toolbar = ({
  editorRef,
  handleAiGenerate,
  onInsertKbDocLink,
}: ToolbarProps) => {
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
      }}
    >
      <EditorToolbar
        editor={editorRef.editor}
        menuInToolbarMore={[
          ...(onInsertKbDocLink
            ? [
                {
                  id: 'kb-doc-link',
                  label: '知识库文档链接',
                  icon: <IconTianjiawendang sx={{ fontSize: '1rem' }} />,
                  onClick: onInsertKbDocLink,
                },
              ]
            : []),
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
