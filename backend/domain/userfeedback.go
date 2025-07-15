package domain

// 用户反馈请求
type FeedbackRequest struct {
	ConversationId  string       `json:"conversation_id"`
	MessageId       string       `json:"message_id" validate:"required"`
	Score           ScoreType    `json:"score"`                               // -1 踩 ,0 1 赞成
	Type            FeedbackType `json:"type"`                                // 1 内容不准确，2 没有帮助，3 其他
	FeedbackContent string       `json:"feedback_content" validate:"max=200"` //限制内容长度
}

type FeedbackType int

const (
	ContentErr FeedbackType = iota + 1
	NoHelp
	Other
)

type ScoreType int

// 0 为默认值表示用户未反馈 ,1 为点赞 ,-1 为不喜欢, 0为默认值
const (
	Like    ScoreType = 1
	DisLike ScoreType = -1
)
