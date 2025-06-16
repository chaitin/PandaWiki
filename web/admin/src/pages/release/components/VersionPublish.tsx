import { addRelease, getNodeList, ITreeItem } from "@/api";
import Card from "@/components/Card";
import DragTree from "@/components/Drag/DragTree";
import { convertToTree } from "@/constant/drag";
import { useAppSelector } from "@/store";
import { filterEmptyFolders, getFlattenIds } from "@/utils/tree";
import { Box, Checkbox, Stack, TextField } from "@mui/material";
import { Message, Modal } from "ct-mui";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

interface VersionPublishProps {
  open: boolean
  defaultSelected?: string[]
  onClose: () => void
  refresh: () => void
}

const VersionPublish = ({ open, defaultSelected = [], onClose, refresh }: VersionPublishProps) => {
  const { kb_id } = useAppSelector(state => state.config)

  const [selected, setSelected] = useState<string[]>([])
  const [folderIds, setFolderIds] = useState<string[]>([])
  const [allIds, setAllIds] = useState<string[]>([])
  const [treeList, setTreeList] = useState<ITreeItem[]>([])

  const { handleSubmit, control, formState: { errors }, reset } = useForm({
    defaultValues: {
      tag: '',
      message: '',
      auto_summary: false,
    }
  })

  const getData = () => {
    getNodeList({ kb_id }).then(res => {
      const unPublishedData = res?.filter(item => (item.status === 1 || item.type === 1)) || []
      const treeData = convertToTree(unPublishedData || [])
      const showTreeData = filterEmptyFolders(treeData)
      setTreeList(showTreeData)
      setAllIds(getFlattenIds(showTreeData))
      setFolderIds(res.filter(item => item.type === 1).map(item => item.id))
    })
  }

  const onSubmit = (data: any) => {
    if (selected.length > 0) {
      addRelease({ kb_id, ...data, node_ids: [...selected, ...folderIds] }).then(() => {
        Message.success(`${data.tag} 版本发布成功`)
        reset()
        setSelected([])
        onClose()
        refresh()
      })
    } else {
      Message.error(allIds.length > 0 ? '请选择要发布的文档' : '暂无未发布文档')
    }
  }

  useEffect(() => {
    if (open) {
      setSelected(defaultSelected);
      getData();
    }
  }, [open, kb_id]);

  return <Modal
    title='发布新版本'
    open={open}
    onCancel={onClose}
    onOk={handleSubmit(onSubmit)}
  >
    <>
      <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
        版本号
        <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
      </Box>
      <Controller
        control={control}
        name='tag'
        rules={{ required: '版本号不能为空' }}
        render={({ field }) => <TextField
          {...field}
          fullWidth
          size='small'
          placeholder='请输入版本号'
          error={!!errors.tag}
          helperText={errors.tag?.message}
        />}
      />
      <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 1 }}>版本描述</Box>
      <Controller
        control={control}
        name='message'
        render={({ field }) => <TextField
          {...field}
          fullWidth
          multiline
          rows={2}
          size='small'
          placeholder='请输入版本描述'
        />}
      />
      <Stack direction='row' component='label' alignItems={'center'} justifyContent={'space-between'} gap={1} sx={{
        py: 1,
        pr: 2,
        cursor: 'pointer',
        borderRadius: '10px',
        fontSize: 14,
        mt: 1,
      }}>
        <Box>
          更新未发布文档
          <Box component='span' sx={{ color: 'text.auxiliary', fontSize: 12, pl: 1 }}>
            共 {allIds.length} 个，已选中 {selected.length} 个
          </Box>
        </Box>
        <Stack direction='row' alignItems={'center'}>
          <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>全选</Box>
          <Checkbox size='small' sx={{ p: 0, color: 'text.disabled', width: '35px', height: '35px' }}
            checked={selected.length === allIds.length} onChange={() => {
              setSelected(selected.length === allIds.length ? [] : allIds)
            }} />
        </Stack>
      </Stack>
      <Card sx={{ bgcolor: 'background.paper2', py: 1 }}>
        <Stack gap={0.25} sx={{ fontSize: 14, maxHeight: 'calc(100vh - 520px)', overflow: 'auto', px: 2 }}>
          <DragTree
            ui='select'
            selected={selected}
            data={treeList}
            refresh={getData}
            onSelectChange={setSelected}
          />
        </Stack>
      </Card>
      <Stack direction='row' alignItems={'center'} gap={1} sx={{ fontSize: 14, lineHeight: '32px', mt: 1 }}>
        <Controller
          control={control}
          name='auto_summary'
          render={({ field }) => <Checkbox
            size='small'
            sx={{ p: 0 }}
            checked={field.value}
            onChange={field.onChange}
          />}
        />
        <Box>当前选中文档自动生成摘要</Box>
      </Stack>
    </>
  </Modal>
}

export default VersionPublish;