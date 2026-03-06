import { findNavIdByNodeId } from '@/utils/tree';
import { useStore } from '@/provider';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export function useSyncNavByDocId() {
  const params = useParams();
  const docId = params?.id as string | undefined;
  const { navDataMap = {}, selectedNavId, setSelectedNavId } = useStore();

  useEffect(() => {
    if (!docId || !setSelectedNavId) return;
    const navId = findNavIdByNodeId(navDataMap, docId);
    if (navId !== undefined && navId !== selectedNavId) {
      setSelectedNavId(navId);
    }
  }, [docId, navDataMap, selectedNavId, setSelectedNavId]);
}
