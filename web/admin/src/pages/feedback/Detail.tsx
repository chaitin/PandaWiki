import { ChatConversationPair } from '@/api';
import { getApiV1ConversationMessageDetail } from '@/request';
import MarkDown from '@/components/MarkDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
} from '@mui/material';
import { Ellipsis, Icon, Modal } from 'ct-mui';
import { useEffect, useState } from 'react';

const Detail = ({
  id,
  open,
  onClose,
  data,
}: {
  id: string;
  open: boolean;
  data: any;
  onClose: () => void;
}) => {
  const [conversations, setConversations] = useState<Omit<
    ChatConversationPair,
    'info'
  > | null>(null);

  useEffect(() => {
    if (open && id && data) {
      getApiV1ConversationMessageDetail({ id }).then(res => {
        setConversations({
          user: data.question,
          assistant: res.content!,
          created_at: res.created_at!,
        });
      });
    }
  }, [open, data, id]);

  return (
    <Modal
      title={
        <Ellipsis
          sx={{
            fontWeight: 'bold',
            fontSize: 20,
            lineHeight: '22px',
            width: 700,
          }}
        >
          问答记录
        </Ellipsis>
      }
      width={800}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Box sx={{ fontSize: 14 }}>
        <Box>
          <Accordion defaultExpanded={true}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 24 }} />}
              sx={{
                userSelect: 'text',
                backgroundColor: 'background.paper2',
                fontSize: '18px',
                fontWeight: 'bold',
              }}
            >
              {conversations?.user}
            </AccordionSummary>
            <AccordionDetails>
              <MarkDown
                content={conversations?.assistant || '未查询到回答内容'}
              />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Modal>
  );
};

export default Detail;
