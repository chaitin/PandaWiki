import React, { useEffect, useState, useMemo } from 'react';
import { CommonItem, StyledCommonWrapper } from '../../components/StyledCommon';
import { TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import DragList from '../../components/DragList';
import SortableItem from '../../components/SortableItem';
import Item from './Item';
import { Empty } from '@ctzhian/ui';
import { DomainNodeType } from '@/request/types';
import type { ConfigProps } from '../type';
import { useAppSelector } from '@/store';
import AddRecommendContent from '@/pages/setting/component/AddRecommendContent';
import { getApiV1NodeRecommendNodes } from '@/request/Node';
import useDebounceAppPreviewData from '@/hooks/useDebounceAppPreviewData';
import { DEFAULT_DATA } from '../../../constants';
import ColorPickerField from '../../components/ColorPickerField';
import { findConfigById, handleLandingConfigs } from '../../../utils';

const DirDocConfig = ({ setIsEdit, id }: ConfigProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const { appPreviewData } = useAppSelector(state => state.config);
  const debouncedDispatch = useDebounceAppPreviewData();
  const { control, setValue, watch, subscribe, reset } = useForm<
    typeof DEFAULT_DATA.dir_doc
  >({
    defaultValues: findConfigById(
      appPreviewData?.settings?.web_app_landing_configs || [],
      id,
    ),
  });

  const nodes = watch('nodes') || [];
  const [open, setOpen] = useState(false);

  const nodeRec = (ids: string[]) => {
    getApiV1NodeRecommendNodes({ kb_id, node_ids: ids }).then(res => {
      setValue('nodes', res);
    });
  };

  const handleListChange = (newList: string[]) => {
    setIsEdit(true);
    nodeRec(newList);
  };

  // 稳定的 SortableItemComponent 引用
  const ItemSortableComponent = useMemo(
    () => (props: any) => <SortableItem {...props} ItemComponent={Item} />,
    [],
  );

  useEffect(() => {
    reset(
      findConfigById(
        appPreviewData?.settings?.web_app_landing_configs || [],
        id,
      ),
      { keepDefaultValues: true },
    );
  }, [appPreviewData, id]);

  useEffect(() => {
    const callback = subscribe({
      formState: {
        values: true,
      },
      callback: ({ values }) => {
        const previewData = {
          ...appPreviewData,
          settings: {
            ...appPreviewData?.settings,
            web_app_landing_configs: handleLandingConfigs({
              id,
              config: appPreviewData?.settings?.web_app_landing_configs || [],
              values,
            }),
          },
        };
        setIsEdit(true);
        debouncedDispatch(previewData);
      },
    });
    return () => {
      callback();
    };
  }, [subscribe, id, appPreviewData]);

  return (
    <StyledCommonWrapper>
      <CommonItem title='标题'>
        <Controller
          control={control}
          name='title'
          render={({ field }) => (
            <TextField label='文字' {...field} placeholder='请输入' />
          )}
        />
        {/* <Controller
          control={control}
          name='title_color'
          render={({ field }) => (
            <ColorPickerField
              label='标题颜色'
              value={field.value}
              onChange={field.onChange}
              sx={{ flex: 1 }}
            />
          )}
        /> */}
      </CommonItem>

      {/* <CommonItem title='背景颜色'>
        <Controller
          control={control}
          name='bg_color'
          render={({ field }) => (
            <ColorPickerField
              value={field.value}
              onChange={field.onChange}
              sx={{ flex: 1 }}
            />
          )}
        />
      </CommonItem> */}
      <CommonItem title='推荐目录' onAdd={() => setOpen(true)}>
        {nodes.length === 0 ? (
          <Empty />
        ) : (
          <DragList
            data={nodes}
            onChange={value => {
              setIsEdit(true);
              setValue('nodes', value);
            }}
            setIsEdit={setIsEdit}
            SortableItemComponent={ItemSortableComponent}
            ItemComponent={Item}
          />
        )}
      </CommonItem>
      <AddRecommendContent
        open={open}
        selected={nodes.map(item => item.id!)}
        onChange={handleListChange}
        onClose={() => setOpen(false)}
        disabled={item => item.type === DomainNodeType.NodeTypeDocument}
        nodeType={DomainNodeType.NodeTypeFolder}
      />
    </StyledCommonWrapper>
  );
};

export default DirDocConfig;
