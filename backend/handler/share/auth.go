package share

import (
	"context"
	"time"

	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/share/v1"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareAuthHandler struct {
	*handler.BaseHandler
	logger      *log.Logger
	kbUsecase   *usecase.KnowledgeBaseUsecase
	authUsecase *usecase.AuthUsecase
	userUsecase *usecase.UserUsecase
}

func NewShareAuthHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	kbUsecase *usecase.KnowledgeBaseUsecase,
	authUsecase *usecase.AuthUsecase,
	userUsecase *usecase.UserUsecase,
) *ShareAuthHandler {
	h := &ShareAuthHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.auth"),
		kbUsecase:   kbUsecase,
		authUsecase: authUsecase,
		userUsecase: userUsecase,
	}

	shareAuthMiddleware := middleware.NewShareAuthMiddleware(logger, kbUsecase)

	share := e.Group("share/v1/auth", shareAuthMiddleware.CheckForbidden)
	share.GET("/get", h.AuthGet)
	share.POST("/login/simple", h.AuthLoginSimple)
	share.POST("/login/user_password", h.AuthLoginUserPassword)
	share.POST("/github", h.AuthGitHub)

	// PRO 前端使用的路由前缀：/share/pro/v1/auth/...
	// 为了兼容，注册一份 pro 路由，并同时为 v1/pro 路径提供 logout 接口。
	proShare := e.Group("share/pro/v1/auth", shareAuthMiddleware.CheckForbidden)
	proShare.POST("/logout", h.AuthLogout)
	share.POST("/logout", h.AuthLogout)

	return h
}

// AuthGet auth获取
//
//	@Tags			share_auth
//	@Summary		AuthGet
//	@Description	AuthGet
//	@ID				v1-AuthGet
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string			true	"kb_id"
//	@Param			param	query		v1.AuthGetReq	true	"para"
//	@Success		200		{object}	domain.PWResponse{data=v1.AuthGetResp}
//	@Router			/share/v1/auth/get [get]
func (h *ShareAuthHandler) AuthGet(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	kb, err := h.kbUsecase.GetKnowledgeBase(ctx, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base detail", err)
	}

	resp := &v1.AuthGetResp{
		AuthType:       kb.AccessSettings.GetAuthType(),
		SourceType:     kb.AccessSettings.SourceType,
		LicenseEdition: consts.GetLicenseEdition(c),
	}
	return h.NewResponseWithData(c, resp)
}

// AuthLoginSimple 简单口令登录
//
//	@Tags			share_auth
//	@Summary		AuthLoginSimple
//	@Description	AuthLoginSimple
//	@ID				v1-AuthLoginSimple
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string					true	"kb_id"
//	@Param			param	body		v1.AuthLoginSimpleReq	true	"para"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/auth/login/simple [post]
func (h *ShareAuthHandler) AuthLoginSimple(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	var req v1.AuthLoginSimpleReq
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse request failed", log.Error(err))
		return h.NewResponseWithError(c, "AuthGet bind failed", nil)
	}

	kb, err := h.kbUsecase.GetKnowledgeBase(ctx, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base detail", err)
	}

	if !kb.AccessSettings.SimpleAuth.Enabled {
		return h.NewResponseWithError(c, "simple auth is not enabled", nil)
	}

	if req.Password != kb.AccessSettings.SimpleAuth.Password {
		return h.NewResponseWithError(c, "simple auth password is incorrect", nil)
	}

	s := c.Get(domain.SessionCacheKey)
	if s == nil {
		return h.NewResponseWithError(c, "get session cache key failed", nil)
	}
	store := s.(sessions.Store)

	newSess := sessions.NewSession(store, domain.SessionName)
	newSess.IsNew = true

	newSess.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 30,
		HttpOnly: true,
	}

	newSess.Values["kb_id"] = kb.ID

	if err := newSess.Save(c.Request(), c.Response()); err != nil {
		return h.NewResponseWithError(c, "save session failed", nil)
	}

	return h.NewResponseWithData(c, nil)
}

// AuthGitHub GitHub登录
//
//	@Tags			ShareAuth
//	@Summary		GitHub登录
//	@Description	GitHub登录
//	@ID				v1-AuthGitHub
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string				true	"kb id"
//	@Param			param	body		v1.AuthGitHubReq	true	"para"
//	@Success		200		{object}	domain.PWResponse{data=v1.AuthGitHubResp}
//	@Router			/share/v1/auth/github [post]
func (h *ShareAuthHandler) AuthGitHub(c echo.Context) error {
	ctx := context.WithValue(c.Request().Context(), consts.ContextKeyEdition, consts.GetLicenseEdition(c))

	var req v1.AuthGitHubReq
	if err := c.Bind(&req); err != nil {
		return err
	}

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	req.KbID = kbID

	valid, err := h.authUsecase.ValidateRedirectUrl(ctx, req.KbID, req.RedirectUrl)
	if err != nil || !valid {
		return h.NewResponseWithError(c, "invalid redirect url", err)
	}

	url, err := h.authUsecase.GenerateGitHubAuthUrl(ctx, req)
	if err != nil {
		return h.NewResponseWithError(c, "GenerateGitHubAuthUrl failed", err)
	}

	return h.NewResponseWithData(c, v1.AuthGitHubResp{
		Url: url,
	})
}

// AuthLoginUserPassword 用户名密码登录
//
//	@Tags			share_auth
//	@Summary		用户名密码登录
//	@Description	通过用户名和密码验证 users 表中的用户，并创建 session
//	@ID				v1-AuthLoginUserPassword
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string						true	"kb_id"
//	@Param			param	body		v1.AuthLoginUserPasswordReq	true	"para"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/auth/login/user_password [post]
func (h *ShareAuthHandler) AuthLoginUserPassword(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	var req v1.AuthLoginUserPasswordReq
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse request failed", log.Error(err))
		return h.NewResponseWithError(c, "invalid request", nil)
	}

	// 验证用户名和密码
	user, err := h.userUsecase.VerifyUser(ctx, req.Username, req.Password)
	if err != nil {
		return h.NewResponseWithError(c, "用户名或密码错误", nil)
	}

	// 验证用户 role：只允许 guest 或 user，不允许 admin
	if user.Role == consts.UserRoleAdmin {
		return h.NewResponseWithError(c, "管理员账户不能通过此方式登录", nil)
	}

	// 获取知识库信息
	kb, err := h.kbUsecase.GetKnowledgeBase(ctx, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base detail", err)
	}

	// 检查是否开启了企业认证
	if !kb.AccessSettings.EnterpriseAuth.Enabled {
		return h.NewResponseWithError(c, "企业认证未开启", nil)
	}

	// 创建或获取 Auth 记录
	auth := &domain.Auth{
		KBID:       kbID,
		UnionID:    user.Account, // 使用用户名作为 union_id
		SourceType: consts.SourceTypeUserPassword,
		IP:         c.RealIP(),
		UserInfo: domain.AuthUserInfo{
			Username: user.Account,
		},
		LastLoginTime: time.Now(),
	}

	ctxWithEdition := context.WithValue(ctx, consts.ContextKeyEdition, consts.GetLicenseEdition(c))
	auth, err = h.authUsecase.AuthRepo.GetOrCreateAuth(ctxWithEdition, auth, consts.SourceTypeUserPassword)
	if err != nil {
		h.logger.Error("failed to get or create auth", log.Error(err))
		return h.NewResponseWithError(c, "failed to create auth record", nil)
	}

	// 保存 session
	if err := h.authUsecase.SaveNewSession(c, auth); err != nil {
		h.logger.Error("failed to save session", log.Error(err))
		return h.NewResponseWithError(c, "failed to save session", nil)
	}

	return h.NewResponseWithData(c, v1.AuthLoginUserPasswordResp{})
}

// AuthLogout 退出登录（清除 share 会话）
//
//	@Tags			share_auth
//	@Summary		用户登出
//	@Description	清除 share 会话 cookie，前端通常调用 /share/pro/v1/auth/logout
//	@ID				v1-AuthLogout
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.Response
//	@Router			/share/pro/v1/auth/logout [post]
func (h *ShareAuthHandler) AuthLogout(c echo.Context) error {
	// 使用 echo-contrib/session 获取当前会话
	sess, err := session.Get(domain.SessionName, c)
	if err != nil {
		h.logger.Error("session get failed on logout", log.Error(err))
		// 即便获取失败，也返回 200，前端只关心本地 cookie 状态
		return h.NewResponseWithData(c, nil)
	}

	// 通过设置 MaxAge<0 来让浏览器删除 cookie
	sess.Options = &sessions.Options{
		Path:   "/",
		MaxAge: -1,
	}
	sess.Values = map[interface{}]interface{}{}

	if err := sess.Save(c.Request(), c.Response()); err != nil {
		h.logger.Error("session save failed on logout", log.Error(err))
		// 不抛给前端错误，避免卡在登出界面
	}

	return h.NewResponseWithData(c, nil)
}
