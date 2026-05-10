import { EditorToolbar, UseTiptapReturn } from '@ctzhian/tiptap';
import { Box, CircularProgress } from '@mui/material';
import { IconDJzhinengzhaiyao, IconTianjiawendang } from '@panda-wiki/icons';

interface ToolbarProps {
  editorRef: UseTiptapReturn;
  imageSummaryLoading?: boolean;
  /** 从知识库已有文档快速插入链接 */
  onInsertKbDocLink?: () => void;
  onImageSummary?: () => void;
}

const Toolbar = ({
  editorRef,
  imageSummaryLoading = false,
  onInsertKbDocLink,
  onImageSummary,
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
            id: 'image-summary',
            label: imageSummaryLoading ? '图片摘要中' : '图片摘要',
            icon: imageSummaryLoading ? (
              <CircularProgress size={16} />
            ) : (
              <IconDJzhinengzhaiyao sx={{ fontSize: '1rem' }} />
            ),
            onClick: imageSummaryLoading ? undefined : onImageSummary,
          },
        ]}
      />
    </Box>
  );
};

export default Toolbar;
