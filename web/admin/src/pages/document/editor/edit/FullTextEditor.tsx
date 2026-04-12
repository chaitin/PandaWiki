import { DocWidth } from '@/constant/enums';
import { Editor, UseTiptapReturn } from '@ctzhian/tiptap';
import { Box } from '@mui/material';
import { useOutletContext } from 'react-router-dom';
import { WrapContext } from '..';

interface FullTextEditorProps {
  editor: UseTiptapReturn['editor'];
  header: React.ReactNode;
  fixed: boolean;
  /** 无工具条时（如只读）与顶栏对齐 */
  contentMarginTop?: string;
}

const FullTextEditor = ({
  editor,
  header,
  fixed,
  contentMarginTop = '102px',
}: FullTextEditorProps) => {
  const { catalogOpen, docWidth } = useOutletContext<WrapContext>();

  return (
    <Box
      sx={{
        width:
          docWidth === 'full'
            ? `calc(100vw - 160px - ${catalogOpen ? 292 : 0}px - ${fixed ? 292 : 0}px)`
            : DocWidth[docWidth as keyof typeof DocWidth].value,
        maxWidth: '100%',
        p: '72px 80px 150px',
        mt: contentMarginTop,
        mx: 'auto',
      }}
    >
      {header}
      <Box
        sx={{
          wordBreak: 'break-all',
          '.tiptap.ProseMirror': {
            overflowX: 'hidden',
            minHeight: 'calc(100vh - 102px - 48px)',
          },
          '.tableWrapper': {
            maxWidth: `calc(100vw - 160px - ${catalogOpen ? 292 : 0}px - ${fixed ? 292 : 0}px)`,
            overflowX: 'auto',
          },
        }}
      >
        <Editor editor={editor} />
      </Box>
    </Box>
  );
};

export default FullTextEditor;
