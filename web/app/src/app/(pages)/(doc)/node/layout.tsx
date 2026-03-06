import StoreProvider from '@/provider';
import { getShareV1NodeList } from '@/request/ShareNode';
import { parsePathname } from '@/utils';
import { getServerPathname } from '@/utils/getServerHeader';
import {
  convertToTree,
  filterEmptyFolders,
  parseNodeListResponse,
} from '@/utils/tree';
import NodeClientLayout from './NodeClientLayout';

export default async function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [nodeListRes, pathname] = await Promise.all([
    getShareV1NodeList(),
    getServerPathname(),
  ]);
  console.log(nodeListRes);

  const { page, id } = parsePathname(pathname);
  const nodeId = page === 'node' ? id : undefined;

  const nodeListRaw = nodeListRes ?? [];
  const { isGrouped, navList, navDataMap, defaultNavId } =
    parseNodeListResponse(nodeListRaw, nodeId);

  const nodeListForTree = isGrouped
    ? (navDataMap[defaultNavId || ''] ?? navDataMap[Object.keys(navDataMap)[0]])
    : nodeListRaw;
  const tree = filterEmptyFolders(
    convertToTree((nodeListForTree || []) as any),
  );

  return (
    <StoreProvider
      nodeList={
        (Array.isArray(nodeListRaw) && !isGrouped ? nodeListRaw : []) as any
      }
      tree={tree}
      navList={navList}
      selectedNavId={defaultNavId || (navList[0]?.id ?? '')}
      navDataMap={navDataMap}
    >
      <NodeClientLayout>{children}</NodeClientLayout>
    </StoreProvider>
  );
}
