package v1

import (
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/user/v1"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type UserHandler struct {
	*handler.BaseHandler
	usecase *usecase.UserUsecase
	logger  *log.Logger
	config  *config.Config
	auth    middleware.AuthMiddleware
}

func NewUserHandler(e *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, usecase *usecase.UserUsecase, auth middleware.AuthMiddleware, config *config.Config) *UserHandler {
	h := &UserHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.user"),
		usecase:     usecase,
		auth:        auth,
		config:      config,
	}
	group := e.Group("/api/v1/user")
	group.POST("/login", h.Login)

	group.GET("", h.GetUserInfo, h.auth.Authorize)
	group.GET("/list", h.ListUsers, h.auth.Authorize)
	group.POST("/create", h.CreateUser, h.auth.Authorize, h.auth.ValidateUserRole(consts.UserRoleAdmin))
	group.PUT("/reset_password", h.ResetPassword, h.auth.Authorize)
	group.DELETE("/delete", h.DeleteUser, h.auth.Authorize, h.auth.ValidateUserRole(consts.UserRoleAdmin))

	return h
}

// CreateUser
//
//	@Summary		CreateUser
//	@Description	CreateUser
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CreateUserReq	true	"CreateUser Request"
//	@Success		200		{object}	domain.Response{data=v1.CreateUserResp}
//	@Router			/api/v1/user/create [post]
func (h *UserHandler) CreateUser(c echo.Context) error {
	var req v1.CreateUserReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	uid := uuid.New().String()
	err := h.usecase.CreateUser(c.Request().Context(), &domain.User{
		ID:       uid,
		Account:  req.Account,
		Password: req.Password,
		Role:     req.Role,
	}, consts.GetLicenseEdition(c))
	if err != nil {
		return h.NewResponseWithError(c, "failed to create user", err)
	}

	return h.NewResponseWithData(c, v1.CreateUserResp{ID: uid})
}

// Login
//
//	@Summary		Login
//	@Description	Login
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.LoginReq	true	"Login Request"
//	@Success		200		{object}	v1.LoginResp
//	@Router			/api/v1/user/login [post]
func (h *UserHandler) Login(c echo.Context) error {
	var req v1.LoginReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	token, err := h.usecase.VerifyUserAndGenerateToken(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to login", err)
	}

	return h.NewResponseWithData(c, v1.LoginResp{Token: token})
}

// GetUserInfo
//
//	@Summary		GetUser
//	@Description	GetUser
//	@Tags			user
//	@Accept			json
//	@Success		200	{object}	v1.UserInfoResp
//	@Router			/api/v1/user [get]
func (h *UserHandler) GetUserInfo(c echo.Context) error {
	ctx := c.Request().Context()
	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return h.NewResponseWithError(c, "authInfo not found in context", nil)
	}
	var userInfo *v1.UserInfoResp

	if authInfo.IsToken {
		token, err := h.usecase.GetToken(c.Request().Context(), authInfo.UserId)
		if err != nil {
			return h.NewResponseWithError(c, "failed to get token", err)
		}

		userInfo = &v1.UserInfoResp{
			ID:        token.ID,
			Account:   token.Name,
			IsToken:   true,
			Role:      consts.UserRoleUser,
			CreatedAt: token.CreatedAt,
		}
	} else {
		user, err := h.usecase.GetUser(c.Request().Context(), authInfo.UserId)
		if err != nil {
			return h.NewResponseWithError(c, "failed to get user", err)
		}

		userInfo = &v1.UserInfoResp{
			ID:         user.ID,
			Account:    user.Account,
			Role:       user.Role,
			IsToken:    false,
			LastAccess: &user.LastAccess,
			CreatedAt:  user.CreatedAt,
		}
	}

	return h.NewResponseWithData(c, userInfo)
}

// ListUsers
//
//	@Summary		ListUsers
//	@Description	ListUsers
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.PWResponse{data=v1.UserListResp}
//	@Router			/api/v1/user/list [get]
func (h *UserHandler) ListUsers(c echo.Context) error {
	var req v1.UserListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	users, err := h.usecase.ListUsers(c.Request().Context())
	if err != nil {
		return h.NewResponseWithError(c, "failed to list users", err)
	}
	return h.NewResponseWithData(c, users)
}

// ResetPassword
//
//	@Summary		ResetPassword
//	@Description	ResetPassword
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.ResetPasswordReq	true	"ResetPassword Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/user/reset_password [put]
func (h *UserHandler) ResetPassword(c echo.Context) error {
	ctx := c.Request().Context()
	var req v1.ResetPasswordReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return h.NewResponseWithError(c, "authInfo not found in context", nil)
	}

	if authInfo.IsToken {
		return h.NewResponseWithError(c, "this api not support token call", nil)
	}

	user, err := h.usecase.GetUser(ctx, authInfo.UserId)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user", err)
	}
	if user.Account == "admin" && authInfo.UserId == req.ID {
		return h.NewResponseWithError(c, "请修改安装目录下 .env 文件中的 ADMIN_PASSWORD，并重启 panda-wiki-api 容器使更改生效。", nil)
	}
	if user.Account != "admin" && authInfo.UserId != req.ID {
		return h.NewResponseWithError(c, "只有管理员可以重置其他用户密码", nil)
	}
	err = h.usecase.ResetPassword(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to reset password", err)
	}

	return h.NewResponseWithData(c, nil)
}

// DeleteUser
//
//	@Summary		DeleteUser
//	@Description	DeleteUser
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.DeleteUserReq	true	"DeleteUser Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/user/delete [delete]
func (h *UserHandler) DeleteUser(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.DeleteUserReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return h.NewResponseWithError(c, "authInfo not found in context", nil)
	}

	if authInfo.IsToken {
		return h.NewResponseWithError(c, "this api not support token call", nil)
	}

	if authInfo.UserId == req.UserID {
		return h.NewResponseWithError(c, "cannot delete yourself", nil)
	}

	user, err := h.usecase.GetUser(ctx, authInfo.UserId)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user", err)
	}

	if user.Role != consts.UserRoleAdmin {
		return h.NewResponseWithError(c, "只有管理员可以删除用户", nil)
	}

	err = h.usecase.DeleteUser(ctx, req.UserID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete user", err)
	}

	return h.NewResponseWithData(c, nil)
}
