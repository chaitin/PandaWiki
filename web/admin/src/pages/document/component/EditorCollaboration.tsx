import { V1NodeDetailResp } from '@/request/types';
import { useAppSelector } from '@/store';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { Editor, useTiptap } from '@yu-cq/tiptap';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

const EditorCollaboration = ({ detail }: { detail: V1NodeDetailResp }) => {
  const { id = '' } = useParams();
  const { user } = useAppSelector(state => state.config);

  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const wsProvider = new WebsocketProvider('ws://localhost:1234', id, doc);
    return { ydoc: doc, provider: wsProvider };
  }, [id, detail?.id]);

  const editorRef = useTiptap({
    editable: true,
    content: detail.content || '',
    exclude: ['invisibleCharacters', 'youtube', 'mention', 'undoRedo'],
    extensions: [
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          id: user.id,
          name: user.account,
          color: 'red',
        },
      }),
    ],
    immediatelyRender: true,
  });

  useEffect(() => {
    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  useEffect(() => {
    return () => {
      if (editorRef?.editor) {
        editorRef.editor.destroy();
      }
    };
  }, [editorRef]);

  return <Editor editor={editorRef.editor} />;
};

export default EditorCollaboration;
