import { ITreeItem } from '@/api';
import { type DragTreeHandle } from '@/components/Drag/DragTree';
import AddDocByType from '@/pages/document/component/AddDocByType';
import DocDelete from '@/pages/document/component/DocDelete';
import DocPropertiesModal from '@/pages/document/component/DocPropertiesModal';
import DocStatus from '@/pages/document/component/DocStatus';
import DocSummary from '@/pages/document/component/DocSummary';
import MoveDocs from '@/pages/document/component/MoveDocs';
import Summary from '@/pages/document/component/Summary';
import { DomainNodeListItemResp } from '@/request/types';
import { applyMoveToTree, pickNodesFromTree } from './utils';

interface DocListModalsProps {
  kb_id: string;
  deleteOpen: boolean;
  opraData: DomainNodeListItemResp[];
  data: ITreeItem[];
  list: DomainNodeListItemResp[];
  dragTreeRef: React.RefObject<DragTreeHandle | null>;
  importKey: string | null;
  urlOpen: boolean;
  summaryOpen: boolean;
  moreSummaryOpen: boolean;
  statusOpen: 'delete' | null;
  moveOpen: boolean;
  propertiesOpen: boolean;
  isBatch: boolean;
  refresh: () => void;
  setData: React.Dispatch<React.SetStateAction<ITreeItem[]>>;
  onCloseDelete: () => void;
  onCancelAddDoc: () => void;
  onCloseSummary: () => void;
  onCloseMoreSummary: () => void;
  onCloseStatus: () => void;
  onCloseMove: () => void;
  onCloseProperties: () => void;
  onOkProperties: () => void;
  removeDeep: (items: ITreeItem[], removeIds: Set<string>) => ITreeItem[];
}

const DocListModals = ({
  kb_id,
  deleteOpen,
  opraData,
  data,
  list,
  dragTreeRef,
  importKey: key,
  urlOpen,
  summaryOpen,
  moreSummaryOpen,
  statusOpen,
  moveOpen,
  propertiesOpen,
  isBatch,
  refresh,
  setData,
  onCloseDelete,
  onCancelAddDoc,
  onCloseSummary,
  onCloseMoreSummary,
  onCloseStatus,
  onCloseMove,
  onCloseProperties,
  onOkProperties,
  removeDeep,
}: DocListModalsProps) => (
  <>
    <DocDelete
      open={deleteOpen}
      onClose={onCloseDelete}
      data={opraData}
      onDeleted={ids => {
        setData(prev => removeDeep(prev, new Set(ids)));
        refresh();
      }}
    />
    {key && (
      <AddDocByType
        type={key as import('@/request/types').ConstsCrawlerSource}
        open={urlOpen}
        onCancel={onCancelAddDoc}
        parentId={opraData[0]?.id || null}
        refresh={refresh}
      />
    )}
    <Summary
      data={opraData[0]}
      kb_id={kb_id}
      open={summaryOpen}
      refresh={refresh}
      onClose={onCloseSummary}
    />
    <DocSummary
      data={opraData}
      kb_id={kb_id}
      open={moreSummaryOpen}
      refresh={refresh}
      onClose={onCloseMoreSummary}
    />
    <DocStatus
      status={statusOpen || 'delete'}
      data={opraData}
      kb_id={kb_id}
      open={!!statusOpen}
      refresh={refresh}
      onClose={onCloseStatus}
    />
    <MoveDocs
      open={moveOpen}
      data={list}
      selected={opraData}
      refresh={refresh}
      onMoved={({ ids, parentId }) => {
        setData(prev => {
          const idSet = new Set(ids);
          const { remaining, picked } = pickNodesFromTree(prev, idSet);
          return applyMoveToTree(remaining, picked, parentId);
        });
        refresh();
        setTimeout(() => {
          if (ids[0]) dragTreeRef.current?.scrollToItem(ids[0]);
        }, 120);
      }}
      onClose={onCloseMove}
    />
    <DocPropertiesModal
      open={propertiesOpen}
      onCancel={onCloseProperties}
      onOk={onOkProperties}
      data={opraData}
      isBatch={isBatch}
    />
  </>
);

export default DocListModals;
