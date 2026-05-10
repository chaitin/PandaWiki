package domain

import "strings"

const (
	QaModeTraining = "training"
	QaModeWork     = "work"
)

// AugmentSystemPromptWithQaMode 在系统提示词末尾追加与前台「培训 / 工作模式」一致的指引。
func AugmentSystemPromptWithQaMode(systemPrompt, qaMode string) string {
	switch strings.TrimSpace(qaMode) {
	case QaModeTraining:
		suffix := "\n\n【当前为培训模式】请采用循序渐进、多举例与概念拆解的方式作答，必要时先澄清术语再引用知识库内容；可适度补充背景以帮助理解，仍须以知识库为依据，不编造事实。"
		return strings.TrimSpace(systemPrompt) + suffix
	case QaModeWork:
		suffix := "\n\n【当前为工作模式】在已进入知识库检索并作答时：优先结论与可执行项，表达精炼，可用列表组织；引用知识库时突出重点出处。（属性补全由系统门控处理，无需在系统提示中重复追问。）"
		return strings.TrimSpace(systemPrompt) + suffix
	default:
		return systemPrompt
	}
}
