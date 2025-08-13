import { getShareV1AppWebInfo } from '@/request/ShareApp';
import { getShareV1NodeDetail } from '@/request/ShareNode';
import { formatMeta } from '@/utils';
import Doc from '@/views/node';
import { ResolvingMetadata } from 'next';
import { cookies, headers } from 'next/headers';

export interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
) {
  const { id } = await params;
  const node: any = await getShareV1NodeDetail({ id });
  return await formatMeta(
    { title: node?.name, description: node?.meta?.summary },
    parent,
  );
}

const DocPage = async ({ params }: PageProps) => {
  const { id = '' } = await params;

  const [kbInfo, node]: any = await Promise.all([
    getShareV1AppWebInfo(),
    getShareV1NodeDetail({ id }),
  ]);

  return <Doc node={node} kbInfo={kbInfo} commentList={[]} />;
};

export default DocPage;
