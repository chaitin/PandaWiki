import { getNodeList, ITreeItem, NodeListItem } from "@/api";
import Card from "@/components/Card";
import DragTree from "@/components/Drag/DragTree";
import { convertToTree } from "@/constant/drag";
import { useAppSelector } from "@/store";
import { filterEmptyFolders } from "@/utils/tree";
import { Box, Button, Checkbox, Stack, TextField } from "@mui/material";
import { Modal } from "ct-mui";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

const VersionPublish = () => {
  const { kb_id } = useAppSelector(state => state.config)
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const [total, setTotal] = useState(0)
  const [selectedTotal, setSelectedTotal] = useState(0)
  const [list, setList] = useState<NodeListItem[]>([])
  const [treeList, setTreeList] = useState<ITreeItem[]>([])

  const { handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      version: '',
      remark: '',
      auto_summary: false,
    }
  })

  const getData = () => {
    getNodeList({ kb_id }).then(res => {
      // const unPublishedData = res?.filter(item => ((item.type === 2 && item.status === 3) || item.type === 1)) || []
      const unPublishedData = res || []
      setList(unPublishedData)
      setTotal(unPublishedData.filter(item => item.type === 2).length)
      const treeData = convertToTree(unPublishedData || [])
      const showTreeData = filterEmptyFolders(treeData)
      setTreeList(showTreeData)
    })
  }

  const onSubmit = (data: any) => {
    console.log(data)
  }

  useEffect(() => {
    setSelectedTotal(list.filter(item => selected.includes(item.id) && item.type === 2).length)
  }, [selected, list])

  useEffect(() => {
    if (kb_id) getData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb_id])

  return <>
    <Button variant='contained' size='small' onClick={() => setOpen(true)}>发布新版本</Button>
    <Modal
      title='发布新版本'
      open={open}
      onCancel={() => setOpen(false)}
      onOk={handleSubmit(onSubmit)}
    >
      <>
        <Box sx={{ fontSize: 14, lineHeight: '32px' }}>
          版本号
          <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>*</Box>
        </Box>
        <Controller
          control={control}
          name='version'
          rules={{ required: '版本号不能为空' }}
          render={({ field }) => <TextField
            {...field}
            fullWidth
            size='small'
            placeholder='请输入版本号'
            error={!!errors.version}
            helperText={errors.version?.message}
          />}
        />
        <Box sx={{ fontSize: 14, lineHeight: '32px', mt: 1 }}>版本描述</Box>
        <Controller
          control={control}
          name='remark'
          render={({ field }) => <TextField
            {...field}
            fullWidth
            multiline
            rows={2}
            size='small'
            placeholder='请输入版本描述'
          />}
        />
        <Stack direction='row' component='label' htmlFor='version-publish-all' alignItems={'center'} justifyContent={'space-between'} gap={1} sx={{
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
              共 {total} 个，已选中 {selectedTotal} 个
            </Box>
          </Box>
          <Stack direction='row' alignItems={'center'}>
            <Box sx={{ color: 'text.auxiliary', fontSize: 12 }}>全选</Box>
            <Checkbox size='small' sx={{ p: 0, color: 'text.disabled', width: '35px', height: '35px' }}
              checked={selected.length === list.length} onChange={() => {
                setSelected(selected.length === list.length ? [] : list.map(item => item.id))
              }} />
          </Stack>
        </Stack>
        <Card sx={{ bgcolor: 'background.paper2', py: 1 }}>
          <Stack gap={0.25} sx={{ fontSize: 14, maxHeight: 300, overflow: 'auto', px: 2 }}>
            <DragTree
              ui='select'
              selected={selected}
              data={treeList}
              refresh={getData}
              onSelectChange={(value) => {
                setSelected(value)
              }}
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
              id='version-publish-auto-summary'
              checked={field.value}
              onChange={field.onChange}
            />}
          />
          <Box>当前选中文档自动生成摘要</Box>
        </Stack>
      </>
    </Modal>
  </>
}

export default VersionPublish;