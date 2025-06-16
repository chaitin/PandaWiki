import { getNodeList, ITreeItem, NodeListFilterData } from "@/api"
import Nodata from '@/assets/images/nodata.png'
import DragTree from "@/components/Drag/DragTree"
import { convertToTree } from "@/constant/drag"
import { useAppSelector } from "@/store"
import { filterEmptyFolders } from "@/utils/tree"
import { Box, Skeleton, Stack } from "@mui/material"
import { Modal } from "ct-mui"
import { useCallback, useEffect, useState } from "react"

interface AddRecommendContentProps {
  open: boolean
  selected: string[]
  onChange: (value: string[]) => void
  onClose: () => void
}

const AddRecommendContent = ({ open, selected, onChange, onClose }: AddRecommendContentProps) => {
  const [list, setList] = useState<ITreeItem[]>([])
  const [loading, setLoading] = useState(false)
  const { kb_id } = useAppSelector(state => state.config)
  const [selectedIds, setSelectedIds] = useState<string[]>(selected)

  const getData = useCallback(() => {
    setLoading(true)
    const params: NodeListFilterData = { kb_id }
    getNodeList(params).then(res => {
      const filterData = res?.filter(item => (item.type === 1 || item.visibility === 2)) || []
      const filterTreeData = convertToTree(filterData)
      const showTreeData = filterEmptyFolders(filterTreeData)
      setList(showTreeData)
    }).finally(() => {
      setLoading(false)
    })
  }, [kb_id])

  useEffect(() => {
    setSelectedIds(selected)
  }, [selected])

  useEffect(() => {
    if (open && kb_id) getData()
  }, [open, kb_id, getData])

  return <Modal
    title="添加卡片"
    open={open}
    onOk={() => {
      onChange(selectedIds)
      onClose()
    }}
    onCancel={onClose}
  >
    {loading ? <Stack gap={2}>
      {new Array(10).fill(0).map((_, index) => <Skeleton variant='text' height={20} key={index} />)}
    </Stack> : list.length > 0 ? <DragTree
      ui='select'
      selected={selectedIds}
      data={list}
      refresh={getData}
      onSelectChange={(value) => {
        setSelectedIds(value)
      }}
      relativeSelect={false}
    /> : <Stack alignItems={'center'} justifyContent={'center'}>
      <img src={Nodata} alt="empty" style={{ width: 100, height: 100 }} />
      <Box sx={{ fontSize: 12, lineHeight: '20px', color: 'text.auxiliary', mt: 1 }}>
        暂无数据，前往文档页面创建文档
      </Box>
    </Stack>}
  </Modal>
}

export default AddRecommendContent