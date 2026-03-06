import { getShareV1NodeDetail } from '@/request/ShareNode';
import type { V1ShareNodeDetailResp } from '@/request/types';
import { formatMeta } from '@/utils';
import Doc from '@/views/node';
import { ResolvingMetadata } from 'next';

export interface PageProps {
  params: Promise<{ id: string }>;
}

const defaultNode = {
  name: '无权访问',
  meta: { summary: '无权访问' },
};

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
) {
  const { id } = await params;
  let node: { name?: string; meta?: { summary?: string } } = defaultNode;
  try {
    const res = await getShareV1NodeDetail({ id, format: 'json' });
    node = (res as V1ShareNodeDetailResp) ?? defaultNode;
  } catch {
    // 使用默认 node
  }
  return await formatMeta(
    { title: node?.name, description: node?.meta?.summary },
    parent,
  );
}

const DocPage = async ({ params }: PageProps) => {
  const { id = '' } = await params;
  let error: unknown = null;
  let node: V1ShareNodeDetailResp | null = null;
  try {
    const res = await getShareV1NodeDetail({ id, format: 'json' });
    node = (res as V1ShareNodeDetailResp) ?? null;
  } catch (err) {
    error = err;
  }
  return <Doc node={node ?? undefined} error={error as Error} />;
};

export default DocPage;
