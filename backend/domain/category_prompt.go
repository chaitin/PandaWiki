package domain

const SettingKeyCategoryPrompts = "category_prompts"

// CategoryPromptItem 后台「提示词」按品类维护的单条记录
type CategoryPromptItem struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Content    string `json:"content"`
	Attributes string `json:"attributes"` // 检索属性维度，逗号分隔，用于附图命中品类后的属性提取引导
}

// CategoryPromptsReq 保存品类提示词列表（整表替换）
type CategoryPromptsReq struct {
	KBID  string               `json:"kb_id" validate:"required"`
	Items []CategoryPromptItem `json:"items"`
}
