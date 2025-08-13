import { ConversationItem } from '@/assets/type';
import { FooterProvider } from '@/components/footer';
import Header from '@/components/header';
import Chat from '@/views/chat';
import Catalog from '@/views/node/Catalog';
import { Box } from '@mui/material';
import { notFound } from 'next/navigation';
import { getShareV1ConversationDetail } from '@/request/ShareConversation';

export interface PageProps {
  params: Promise<{ id: string[] }>;
}

const ChatPage = async ({ params }: PageProps) => {
  const { id } = await params;
  if (id && id.length > 1) {
    notFound();
  }
  const conversation: ConversationItem[] = [];

  if (id && id[0]) {
    const res = await getShareV1ConversationDetail({
      id: id[0],
    });
    if (res.messages) {
      let current: Partial<ConversationItem> = {};
      res.messages.forEach(message => {
        if (message.role === 'user') {
          if (current.q) {
            conversation.push({
              q: current.q,
              a: '',
              score: 0,
              update_time: '',
              message_id: '',
              source: 'history',
            } as ConversationItem);
          }
          current = {
            q: message.content,
          };
        } else if (message.role === 'assistant') {
          if (current.q) {
            current.a = message.content;
            current.update_time = message.created_at;
            current.score = 0;
            current.message_id = '';
            current.source = 'history';
            conversation.push(current as ConversationItem);
            current = {};
          }
        }
      });

      if (current.q) {
        conversation.push({
          q: current.q,
          a: '',
          score: 0,
          update_time: '',
          message_id: '',
          source: 'history',
        });
      }
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      <Catalog />
      <Header />
      <Chat conversation={conversation} />
      <FooterProvider />
    </Box>
  );
};

export default ChatPage;
