package share

import (
	"context"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
	wechat_v2 "github.com/silenceper/wechat/v2"
	"github.com/silenceper/wechat/v2/cache"
	offConfig "github.com/silenceper/wechat/v2/officialaccount/config"
	"github.com/silenceper/wechat/v2/officialaccount/message"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat"
	"github.com/chaitin/panda-wiki/pkg/bot/wechatservice"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareAppHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.AppUsecase
}

func NewShareAppHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	usecase *usecase.AppUsecase,
) *ShareAppHandler {
	h := &ShareAppHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.app"),
		usecase:     usecase,
	}

	share := e.Group("share/v1/app",
		func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				c.Response().Header().Set("Access-Control-Allow-Origin", "*")
				c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept")
				if c.Request().Method == "OPTIONS" {
					return c.NoContent(http.StatusOK)
				}
				return next(c)
			}
		})
	share.GET("/web/info", h.GetWebAppInfo)
	share.GET("/widget/info", h.GetWidgetAppInfo)

	share.GET("/wechat/app", h.VerifyUrlWechatApp)
	share.POST("/wechat/app", h.WechatHandlerApp)

	// 微信客服
	share.GET("/wechat/service", h.VerifyUrlWechatService)
	share.POST("/wechat/service", h.WechatHandlerService)

	// wechat official account
	share.GET("/wechat/official_account", h.VerifyUrlWechatOfficialAccount)
	share.POST("/wechat/official_account", h.WechatHandlerOfficialAccount)
	return h
}

// GetAppInfo
//
//	@Summary		GetAppInfo
//	@Description	GetAppInfo
//	@Tags			share_app
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/app/web/info [get]
func (h *ShareAppHandler) GetWebAppInfo(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	appInfo, err := h.usecase.GetWebAppInfo(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, err.Error(), err)
	}
	return h.NewResponseWithData(c, appInfo)
}

// GetWidgetAppInfo
//
//	@Summary		GetWidgetAppInfo
//	@Description	GetWidgetAppInfo
//	@Tags			share_app
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/app/widget/info [get]
func (h *ShareAppHandler) GetWidgetAppInfo(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	appInfo, err := h.usecase.GetWidgetAppInfo(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, err.Error(), err)
	}
	return h.NewResponseWithData(c, appInfo)
}

func (h *ShareAppHandler) VerifyUrlWechatApp(c echo.Context) error {
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")
	echoStr := c.QueryParam("echostr")

	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	if signature == "" || timestamp == "" || nonce == "" || echoStr == "" {
		return h.NewResponseWithError(
			c, "verify wechat params failed", nil,
		)
	}

	ctx := c.Request().Context()

	req, err := h.usecase.VerifyUrlWechatAPP(ctx, signature, timestamp, nonce, echoStr, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "VerifyURL failed", err)
	}

	// success
	return c.String(http.StatusOK, string(req))
}

func (h *ShareAppHandler) WechatHandlerApp(c echo.Context) error {
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	remoteIP := ""
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		h.logger.Error("get request failed", log.Error(err))
		return h.NewResponseWithError(c, "Internal Server Error", err)
	}
	defer c.Request().Body.Close()

	ctx := c.Request().Context()

	// get appinfo and init wechatConfig
	// 查找数据库，找到对应的app配置
	appInfo, err := h.usecase.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatBot)
	if err != nil {
		return h.NewResponseWithError(c, "GetAppDetailByKBIDAndAppType failed", err)
	}

	if appInfo.Settings.WeChatAppIsEnabled != nil && !*appInfo.Settings.WeChatAppIsEnabled {
		return h.NewResponseWithError(c, "wechat app bot is not enabled", nil)
	}

	wechatConfig, err := h.usecase.NewWechatConfig(context.Background(), appInfo, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "wechat app config error", err)
	}

	// 解密消息
	wxCrypt := wxbizmsgcrypt.NewWXBizMsgCrypt(wechatConfig.Token, wechatConfig.EncodingAESKey, wechatConfig.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxCrypt.DecryptMsg(signature, timestamp, nonce, body)
	if errCode != nil {
		return h.NewResponseWithError(c, "DecryptMsg failed", nil)
	}

	msg, err := wechatConfig.UnmarshalMsg(decryptMsg)
	if err != nil {
		return h.NewResponseWithError(c, "UnmarshalMsg failed", err)
	}
	h.logger.Info("wechat app msg", log.Any("user msg", msg))

	if msg.MsgType != "text" { // 用户进入会话，或者其他非提问类型的事件
		return c.String(http.StatusOK, "")
	}

	immediateResponse, err := wechatConfig.SendResponse(*msg, "用户稍等,正在思考您的问题,请稍候...")
	if err != nil {
		return h.NewResponseWithError(c, "Failed to send immediate response", err)
	}

	go func(msg *wechat.ReceivedMessage, wechatConfig *wechat.WechatConfig, kbId string, remoteIP string) {
		ctx := context.Background()
		err := h.usecase.Wechat(ctx, msg, wechatConfig, kbId, remoteIP)
		if err != nil {
			h.logger.Error("wechat async failed")
		}
	}(msg, wechatConfig, kbID, remoteIP)

	return c.XMLBlob(http.StatusOK, []byte(immediateResponse))
}

// 验证微信客服消息
func (h *ShareAppHandler) VerifyUrlWechatService(c echo.Context) error {
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")
	echoStr := c.QueryParam("echostr")

	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	if signature == "" || timestamp == "" || nonce == "" || echoStr == "" {
		return h.NewResponseWithError(
			c, "verify wechat service params failed", nil,
		)
	}

	ctx := c.Request().Context()

	req, err := h.usecase.VerifyUrlWechatService(ctx, signature, timestamp, nonce, echoStr, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "VerifyURL_Service failed", err)
	}

	// success
	return c.String(http.StatusOK, string(req))
}

// 处理用户的请求，客服回复消息
func (h *ShareAppHandler) WechatHandlerService(c echo.Context) error {
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")

	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		h.logger.Error("get request failed", log.Error(err))
		return h.NewResponseWithError(c, "Internal Server Error", err)
	}
	defer c.Request().Body.Close()

	ctx := c.Request().Context()

	// 查找数据库，找到对应的app配置
	appInfo, err := h.usecase.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatServiceBot)

	if err != nil {
		h.logger.Error("GetAppDetailByKBIDAndAppType failed", log.Error(err))
		return h.NewResponseWithError(c, "GetAppDetailByKBIDAndAppType failed", err)
	}
	if appInfo.Settings.WeChatServiceIsEnabled != nil && !*appInfo.Settings.WeChatServiceIsEnabled {
		return h.NewResponseWithError(c, "wechat service bot is not enabled", nil)
	}

	// 创建一个wechat service对象
	wechatServiceConf, err := h.usecase.NewWechatServiceConfig(context.Background(), appInfo, kbID)

	h.logger.Info("wechat service config", log.Any("wechat service config", wechatServiceConf))

	if err != nil {
		return h.NewResponseWithError(c, "New WechatServiceConfig failed", err)
	}

	// 解密消息
	wxCrypt := wxbizmsgcrypt.NewWXBizMsgCrypt(wechatServiceConf.Token, wechatServiceConf.EncodingAESKey, wechatServiceConf.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxCrypt.DecryptMsg(signature, timestamp, nonce, body)
	if errCode != nil {
		h.logger.Error("DecryptMsg failed", log.Any("decryptMsg err", errCode))
		return h.NewResponseWithError(c, "DecryptMsg failed", nil)
	}
	// 解密成功了
	h.logger.Info("收到了用户发送或者事件的原始消息（解密之后）", log.Any("decryptMsg", decryptMsg))

	// 反序列化
	msg, err := wechatServiceConf.UnmarshalMsg(decryptMsg)
	if err != nil {
		h.logger.Error("UnmarshalMsg failed", log.Error(err))
		return h.NewResponseWithError(c, "UnmarshalMsg failed", err)
	}

	// 这个是用户发送的消息
	h.logger.Info("收到用户消息（提问的问题）用户,事件类型", msg.ToUserName, msg.Event)

	// 没有问题则开启异步拉去用户发给微信客服的消息，并且处理用户的消息
	go func(WechatServiceConf *wechatservice.WechatServiceConfig, msg *wechatservice.WeixinUserAskMsg, kbID string) {
		ctx := context.Background()
		err := h.usecase.WechatService(ctx, msg, kbID, WechatServiceConf)
		if err != nil {
			h.logger.Error("wechat async failed", log.Any("Wechat_Service", err))
		}
	}(wechatServiceConf, msg, kbID)

	// 先响应
	return c.JSON(http.StatusOK, "success") // 不会发送给用户，会被微信服务器忽略
}

func (h *ShareAppHandler) VerifyUrlWechatOfficialAccount(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	ctx := c.Request().Context()

	// get wechat official account info
	appInfo, err := h.usecase.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatOfficialAccount)
	if err != nil {
		h.logger.Error("get app detail failed")
		return h.NewResponseWithError(c, "GetAppDetailByKBIDAndAppType failed", err)
	}

	if appInfo.Settings.WechatOfficialAccountIsEnabled != nil && !*appInfo.Settings.WechatOfficialAccountIsEnabled {
		return h.NewResponseWithError(c, "wechat official account is not enabled", err)
	}
	wc := wechat_v2.NewWechat()
	memory := cache.NewMemory()
	cfg := &offConfig.Config{
		AppID:          appInfo.Settings.WechatOfficialAccountAppID,
		AppSecret:      appInfo.Settings.WechatOfficialAccountAppSecret,
		Token:          appInfo.Settings.WechatOfficialAccountToken,
		EncodingAESKey: appInfo.Settings.WechatOfficialAccountEncodingAESKey,
		Cache:          memory,
	}
	officialAccount := wc.GetOfficialAccount(cfg)
	server := officialAccount.GetServer(c.Request(), c.Response().Writer)

	// success
	err = server.Serve()
	if err != nil {
		return h.NewResponseWithError(c, "serve message failed", err)
	}
	return nil

}

func (h *ShareAppHandler) WechatHandlerOfficialAccount(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	ctx := c.Request().Context()

	// get wechat official account info
	appInfo, err := h.usecase.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatOfficialAccount)
	if err != nil {
		h.logger.Error("get app detail failed")
		return h.NewResponseWithError(c, "GetAppDetailByKBIDAndAppType failed", err)
	}

	if appInfo.Settings.WechatOfficialAccountIsEnabled != nil && !*appInfo.Settings.WechatOfficialAccountIsEnabled {
		return h.NewResponseWithError(c, "wechat official account is not enabled", err)
	}
	wc := wechat_v2.NewWechat()
	memory := cache.NewMemory()
	cfg := &offConfig.Config{
		AppID:          appInfo.Settings.WechatOfficialAccountAppID,
		AppSecret:      appInfo.Settings.WechatOfficialAccountAppSecret,
		Token:          appInfo.Settings.WechatOfficialAccountToken,
		EncodingAESKey: appInfo.Settings.WechatOfficialAccountEncodingAESKey,
		Cache:          memory,
	}
	officialAccount := wc.GetOfficialAccount(cfg)
	server := officialAccount.GetServer(c.Request(), c.Response().Writer)

	// message handler
	server.SetMessageHandler(func(msg *message.MixMessage) *message.Reply {
		h.logger.Info("received message:", log.Any("msgtype", msg.MsgType), log.Any("fromUserName", msg.FromUserName), log.String("content", msg.Content), log.Any("event type", msg.Event))

		switch msg.MsgType {
		case message.MsgTypeText:
			// text消息
			userOpenID := msg.FromUserName
			userContent := msg.Content
			h.logger.Info("user_open_id user_content", log.Any("user_open_id", userOpenID), log.Any("user content", userContent))
			// 异步发送
			go func(openID, content string) {
				ctx := context.Background()
				// send content to ai
				result, err := h.usecase.GetWechatOfficialAccountResponse(ctx, officialAccount, kbID, openID, content)
				if err != nil {
					h.logger.Error("get wechat official account response failed", log.Error(err))
					return
				}
				// send response to user --> 需要开启客服消息权限
				err = h.usecase.SendCustomerServiceMessage(officialAccount, string(userOpenID), result)
				if err != nil {
					h.logger.Error("send to customer service failed", log.Error(err))
				}
			}(string(userOpenID), userContent)
			return &message.Reply{MsgType: message.MsgTypeText, MsgData: message.NewText("您的问题已经收到，正在努力思考中，请稍候...")}
		case message.MsgTypeEvent:
			if msg.Event == message.EventSubscribe {
				return &message.Reply{MsgType: message.MsgTypeText, MsgData: message.NewText("感谢关注,欢迎提问！")} // 立即回复简单信息
			}
			return nil
		default:
			h.logger.Info("unknown message type", log.Any("message type", msg.MsgType))
			return &message.Reply{MsgType: message.MsgTypeText, MsgData: message.NewText("未知消息类型，请发送正确的类型...")}
		}
	})

	// success
	err = server.Serve()
	if err != nil {
		h.logger.Error("serve message failed", log.Error(err))
		return h.NewResponseWithError(c, "serve message failed", err)
	}

	// send message to user
	err = server.Send()
	if err != nil {
		h.logger.Error("send message failed", log.Error(err))
		return h.NewResponseWithError(c, "send message failed", err)
	}
	return nil
}
