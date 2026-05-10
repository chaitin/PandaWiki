import Card from '@/components/Card';
import {
  CategoryPromptItem,
  getApiV1CategoryPrompts,
  putApiV1CategoryPrompts,
} from '@/request/CategoryPrompt';
import { useAppSelector } from '@/store';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { message } from '@ctzhian/ui';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const emptyRow = (): CategoryPromptItem => ({
  id: '',
  name: '',
  content: '',
  attributes: '',
});

const CategoryPromptPage = () => {
  const { kb_id } = useAppSelector(s => s.config);
  const [items, setItems] = useState<CategoryPromptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!kb_id) return;
    setLoading(true);
    try {
      const res = await getApiV1CategoryPrompts({ id: kb_id });
      const list = res?.items?.length ? res.items : [emptyRow()];
      setItems(list);
    } catch {
      setItems([emptyRow()]);
    } finally {
      setLoading(false);
    }
  }, [kb_id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    if (!kb_id) {
      message.error('请先选择知识库');
      return;
    }
    for (const it of items) {
      const n = it.name.trim();
      const c = it.content.trim();
      if (!n && c) {
        message.error('请为已填写提示词的条目填写品类名，或清空该条提示词');
        return;
      }
      if (n && !c) {
        message.error(`品类「${n}」的提示词不能为空`);
        return;
      }
    }
    setSaving(true);
    try {
      await putApiV1CategoryPrompts({
        kb_id,
        items: items.filter(it => it.name.trim() !== ''),
      });
      message.success('保存成功');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    setItems(prev => [...prev, { ...emptyRow(), id: uuidv4() }]);
  };

  const removeRow = (index: number) => {
    setItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [emptyRow()];
    });
  };

  if (!kb_id) {
    return (
      <Card>
        <Typography sx={{ p: 2 }} color='text.secondary'>
          请先选择知识库
        </Typography>
      </Card>
    );
  }

  return (
    <Card>
      <Stack sx={{ p: 2 }} gap={2}>
        <Box>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            提示词
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            按品类维护提示词与可选的「属性维护」（多个属性用逗号分隔）。保存时仅保留已填写品类名的条目。图片类文档生成摘要时，会先判断是否属于某一品类：命中则按对应提示词写摘要；未命中则对画面做细致客观描述。智能问答上传附图命中品类后，若填写了属性，会按这些维度引导模型提取检索要点。会优先使用后台已配置的「analysis-vl」多模态模型做画面与品类理解；未配置时回退为当前对话模型（需开启支持图片）。
          </Typography>
        </Box>

        {loading ? (
          <Typography color='text.secondary'>加载中…</Typography>
        ) : (
          <Stack gap={2}>
            {items.map((row, index) => (
              <Stack
                key={row.id || `row-${index}`}
                direction={{ xs: 'column', md: 'row' }}
                gap={2}
                alignItems={{ md: 'flex-start' }}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TextField
                  label='品类名'
                  size='small'
                  value={row.name}
                  onChange={e => {
                    const v = e.target.value;
                    setItems(prev =>
                      prev.map((it, i) =>
                        i === index ? { ...it, name: v } : it,
                      ),
                    );
                  }}
                  sx={{ minWidth: { md: 200 }, flexShrink: 0 }}
                />
                <Stack sx={{ flex: 1, minWidth: 0 }} gap={1.5}>
                  <TextField
                    label='提示词'
                    size='small'
                    fullWidth
                    multiline
                    minRows={4}
                    value={row.content}
                    onChange={e => {
                      const v = e.target.value;
                      setItems(prev =>
                        prev.map((it, i) =>
                          i === index ? { ...it, content: v } : it,
                        ),
                      );
                    }}
                  />
                  <TextField
                    label='属性维护'
                    size='small'
                    fullWidth
                    placeholder='多个属性用逗号分隔，例如：品牌,型号,颜色'
                    helperText='可选。附图问答命中该品类时，用于引导按这些维度提取检索要点。'
                    value={row.attributes ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      setItems(prev =>
                        prev.map((it, i) =>
                          i === index ? { ...it, attributes: v } : it,
                        ),
                      );
                    }}
                  />
                </Stack>
                <IconButton
                  aria-label='删除'
                  color='error'
                  onClick={() => removeRow(index)}
                  sx={{ alignSelf: { xs: 'flex-end', md: 'center' } }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}

        <Stack direction='row' gap={2} flexWrap='wrap'>
          <Button variant='outlined' onClick={addRow} disabled={loading}>
            添加品类
          </Button>
          <Button
            variant='contained'
            onClick={onSave}
            disabled={loading || saving}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
};

export default CategoryPromptPage;
