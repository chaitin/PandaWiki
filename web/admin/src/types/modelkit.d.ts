declare module '@ctzhian/modelkit' {
  import type { ComponentType } from 'react';

  export interface ModelParam {
    context_window?: number;
    max_tokens?: number;
    r1_enabled?: boolean;
    support_computer_use?: boolean;
    support_images?: boolean;
    support_prompt_cache?: boolean;
    temperature?: number;
  }

  export interface Model {
    id?: string;
    model_name?: string;
    provider?: string;
    model_type?: string;
    base_url?: string;
    api_key?: string;
    api_header?: string;
    api_version?: string;
    is_active?: boolean;
    show_name?: string;
    param?: ModelParam;
  }

  export interface CreateModelReq extends Model {}

  export interface UpdateModelReq extends Model {}

  export interface CheckModelReq extends Model {}

  export interface ListModelReq {
    provider?: string;
    model_type?: string;
    base_url?: string;
    api_key?: string;
    api_header?: string;
  }

  export interface ModelListItem {
    model?: string;
  }

  export interface ModelService {
    createModel(data: CreateModelReq): Promise<{ model: Model }>;
    updateModel(data: UpdateModelReq): Promise<{ model: Model }>;
    checkModel(data: CheckModelReq): Promise<{ model: Model; error: string }>;
    listModel(
      data: ListModelReq,
    ): Promise<{ models: ModelListItem[]; error: string }>;
  }

  export interface ModelModalProps {
    open: boolean;
    model_type: string;
    data?: Model | null;
    onClose: () => void;
    refresh: () => void | Promise<void>;
    modelService: ModelService;
    language?: string;
    messageComponent?: unknown;
    is_close_model_remark?: boolean;
    addingModelTutorialURL?: string;
  }

  export const ModelModal: ComponentType<ModelModalProps>;
}
