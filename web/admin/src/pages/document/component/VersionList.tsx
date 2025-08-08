import {
  getApiProV1NodeReleaseDetail,
  getApiProV1NodeReleaseList,
} from '@/request/pro/Node';
import {
  DomainGetNodeReleaseDetailResp,
  DomainNodeReleaseListItem,
} from '@/request/pro/types';
import { useAppSelector } from '@/store';
import { addOpacityToColor } from '@/utils';
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material';
import { Editor, TocList, useTiptap } from '@yu-cq/tiptap';
import { Ellipsis, Message } from 'ct-mui';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EditorDocNav from './EditorDocNav';
import EditorSummary from './EditorSummary';

interface VersionListProps {
  changeVersion: (
    version: DomainGetNodeReleaseDetailResp & {
      release: DomainNodeReleaseListItem;
    },
  ) => void;
}

const VersionList = ({ changeVersion }: VersionListProps) => {
  const theme = useTheme();
  const { id = '' } = useParams();
  const { kb_id } = useAppSelector(state => state.config);
  const isWideScreen = useMediaQuery('(min-width:1400px)');

  const [version, setVersion] = useState<DomainNodeReleaseListItem[]>([]);
  const [curVersion, setCurVersion] =
    useState<DomainNodeReleaseListItem | null>(null);

  const [curNode, setCurNode] = useState<DomainGetNodeReleaseDetailResp | null>(
    null,
  );
  const [headings, setHeadings] = useState<TocList>([]);

  const handleTocUpdate = (toc: TocList) => {
    setHeadings(toc);
  };

  const editorRef = useTiptap({
    content: '',
    editable: false,
    immediatelyRender: true,
    onError: (error: Error) => {
      Message.error(error.message);
    },
    onTocUpdate: handleTocUpdate,
  });

  const getDetail = (v: DomainNodeReleaseListItem) => {
    getApiProV1NodeReleaseDetail({ id: v.id! }).then(res => {
      setCurNode(res);
      changeVersion({
        ...res,
        release: v,
      });
    });
  };

  useEffect(() => {
    if (curNode && editorRef) {
      editorRef.editor.commands.setContent(curNode.content || '');
    }
  }, [curNode]);

  useEffect(() => {
    if (curVersion) {
      getDetail(curVersion);
    }
  }, [curVersion]);

  useEffect(() => {
    getApiProV1NodeReleaseList({ kb_id, node_id: id }).then((res) => {
      setVersion(res || []);
      if (res.length > 0) {
        setCurVersion(res[0]);
      }
    });
  }, []);

  return (
    <Box
      sx={{
        pt: '69px',
        display: 'flex',
        justifyContent: 'center',
        gap: isWideScreen ? 1 : 0,
      }}
    >
      <Box
        sx={{
          width: 800,
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
          bgcolor: '#fff',
          borderRadius: '6px',
          minHeight: 'calc(100vh - 69px - 16px)',
          m: '0 auto',
        }}
      >
        {curNode && (
          <Box
            sx={{
              p: 4,
              borderRadius: '0 0 6px 6px',
              bgcolor: '#fff',
              '.tiptap': {
                minHeight: 'calc(100vh - 185px)',
              },
            }}
          >
            <Editor editor={editorRef.editor} />
          </Box>
        )}
      </Box>
      {curNode && (
        <>
          <Box
            sx={{
              width: 292,
              position: 'fixed',
              right: 'calc(50vw - 700px - 4px)',
              top: 69,
              height: 'calc(100vh - 105px)',
              overflowY: 'auto',
              zIndex: 1,
            }}
          >
            <Stack gap={1}>
              <EditorSummary
                readonly
                kb_id={kb_id || ''}
                id={curVersion?.id || ''}
                name={curNode?.name || ''}
                summary={curNode?.meta?.summary || ''}
              />
              <EditorDocNav headers={headings} />
            </Stack>
          </Box>
        </>
      )}
      <Box
        sx={{
          width: 292,
          bgcolor: '#fff',
          position: 'fixed',
          left: 'calc(50vw - 700px - 4px)',
          top: '69px',
          pb: 1,
          zIndex: 1,
          borderRadius: '6px',
        }}
      >
        <Box
          sx={{
            p: 2,
            px: 3,
            fontSize: 16,
            fontWeight: 'bold',
            borderBottom: '2px solid',
            borderColor: 'divider',
          }}
        >
          版本历史
        </Box>
        <Stack
          sx={{
            maxHeight: 'calc(100vh - 153px)',
            overflowY: 'auto',
          }}
        >
          {version.map(it => (
            <Box
              key={it.release_id}
              onClick={() => {
                setCurVersion(it);
              }}
              sx={{
                p: 2,
                cursor: 'pointer',
                fontFamily: 'Mono',
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: 'background.paper',
                ':hover': {
                  bgcolor: 'background.paper2',
                  borderLeftColor: 'background.paper2',
                },
                ...(it.release_id === curVersion?.release_id && {
                  bgcolor: `${addOpacityToColor(
                    theme.palette.primary.main,
                    0.1,
                  )} !important`,
                  borderLeft: `4px solid`,
                  borderLeftColor: `${theme.palette.primary.main} !important`,
                }),
              }}
            >
              <Stack
                direction={'row'}
                gap={1}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Ellipsis sx={{ fontWeight: 'bold', flex: 1, width: 0 }}>
                  {it.release_name}
                </Ellipsis>
                <Box
                  sx={{ fontSize: 12, flexShrink: 0, color: 'text.auxiliary' }}
                >
                  {dayjs(it.updated_at).fromNow()}
                </Box>
              </Stack>
              <Box
                sx={{
                  mt: 1,
                  fontSize: 14,
                  color: 'text.secondary',
                }}
              >
                {it.release_message}
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default VersionList;
