import { addRelease, getNodeList, ITreeItem, NodeListItem } from "@/api";
import Card from "@/components/Card";
import DragTree from "@/components/Drag/DragTree";
import { convertToTree } from "@/constant/drag";
import { useAppSelector } from "@/store";
import { filterEmptyFolders } from "@/utils/tree";
import { Box, Checkbox, Stack, TextField } from "@mui/material";
import { Message, Modal } from "ct-mui";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
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
  // const [allIds, setAllIds] = useState<string[]>([])
  const [treeList, setTreeList] = useState<ITreeItem[]>([])
  const [total, setTotal] = useState(0)
  const [list, setList] = useState<NodeListItem[]>([])

  const { handleSubmit, control, formState: { errors }, reset, setValue } = useForm({
    defaultValues: {
      tag: '',
      message: '',
    }
  })

  const getData = () => {
    getNodeList({ kb_id }).then(res => {
      const unPublishedData = res?.filter(item => (item.status === 1 || item.type === 1)) || []
      setList(unPublishedData)
      setSelected(defaultSelected.length > 0 ? defaultSelected : unPublishedData.map(it => it.id))
      setTotal(unPublishedData.filter(item => item.type === 2).length)
      // const unPublishedData = res?.filter(item => (item.status === 1 || item.type === 1)) || []
      const treeData = convertToTree(unPublishedData || [])
      const showTreeData = filterEmptyFolders(treeData)
      setTreeList(showTreeData)
      // setAllIds(getFlattenIds(showTreeData))
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
      Message.error(total > 0 ? '请选择要发布的文档' : '暂无未发布文档')
    }
  }

  useEffect(() => {
    if (open) {
      getData();
      setValue('tag', `${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substring(2, 8)}`)
      setValue('message', `${dayjs().format('YYYY 年 MM 月 DD 日 HH 时 mm 分 ss 秒')}发布`)
    }
  }, [open, kb_id]);

  const selectedTotal = useMemo(() => {
    return list.filter(item => selected.includes(item.id) && item.type === 2).length;
  }, [selected, list]);

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
      <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 1 }}>
        版本描述
        <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
      </Box>
      <Controller
        control={control}
        name='message'
        rules={{ required: '版本描述不能为空' }}
        render={({ field }) => <TextField
          {...field}
          fullWidth
          multiline
          rows={2}
          size='small'
          placeholder='请输入版本描述'
          error={!!errors.message}
          helperText={errors.message?.message}
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
          未发布文档
          <Box component='span' sx={{ color: 'text.auxiliary', fontSize: 12, pl: 1 }}>
            共 {total} 个，已选中 {selectedTotal} 个
          </Box>
        </Box>
        <Stack direction='row' alignItems={'center'}>
          <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>全选</Box>
          <Checkbox size='small' sx={{ p: 0, color: 'text.disabled', width: '35px', height: '35px' }}
            checked={selectedTotal === total} onChange={() => {
              setSelected(selectedTotal === total ? [] : list.map(item => item.id))
            }} />
        </Stack>
      </Stack>
      <Card sx={{ bgcolor: 'background.paper2', py: 1 }}>
        <Stack gap={0.25} sx={{ fontSize: 14, maxHeight: 'calc(100vh - 520px)', overflowY: 'auto', px: 2 }}>
          <DragTree
            ui='select'
            selected={selected}
            data={treeList}
            refresh={getData}
            onSelectChange={setSelected}
          />
        </Stack>
      </Card>
    </>
  </Modal>
}

export default VersionPublish;