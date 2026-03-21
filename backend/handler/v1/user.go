package v1

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/lib/pq"

	v1 "github.com/chaitin/panda-wiki/api/user/v1"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/pkg/ratelimit"
	"github.com/chaitin/panda-wiki/store/cache"
	"github.com/chaitin/panda-wiki/usecase"
)

type UserHandler struct {
	*handler.BaseHandler
	usecase     *usecase.UserUsecase
	authUsecase *usecase.AuthUsecase
	logger      *log.Logger
	config      *config.Config
	auth        middleware.AuthMiddleware
	rateLimiter *ratelimit.RateLimiter
}

func NewUserHandler(e *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, usecase *usecase.UserUsecase, authUsecase *usecase.AuthUsecase, auth middleware.AuthMiddleware, config *config.Config, cache *cache.Cache) *UserHandler {
	handlerLogger := logger.WithModule("handler.v1.user")
	h := &UserHandler{
		BaseHandler: baseHandler,
		logger:      handlerLogger,
		usecase:     usecase,
		authUsecase: authUsecase,
		auth:        auth,
		config:      config,
		rateLimiter: ratelimit.NewRateLimiter(handlerLogger, cache),
	}
	group := e.Group("/api/v1/user")
	group.POST("/login", h.Login)

	group.GET("", h.GetUserInfo, h.auth.Authorize)
	group.GET("/list", h.ListUsers, h.auth.Authorize)
	userManagePerm := h.auth.ValidateUserRoleOrAnyKBPerm(consts.UserRoleAdmin, consts.UserKBPermissionUserManage)
	group.GET("/guest/list", h.ListGuestUsers, h.auth.Authorize, userManagePerm)
	group.POST("/create", h.CreateUser, h.auth.Authorize, userManagePerm)
	group.POST("/guest/create", h.CreateGuestUser, h.auth.Authorize, userManagePerm)
	group.PUT("/reset_password", h.ResetPassword, h.auth.Authorize)
	group.PUT("/guest/:id", h.UpdateGuestUser, h.auth.Authorize, userManagePerm)
	group.DELETE("/delete", h.DeleteUser, h.auth.Authorize, userManagePerm)
	group.DELETE("/guest/:id", h.DeleteGuestUser, h.auth.Authorize, userManagePerm)

	// 用户组管理
	group.GET("/auth_group/list", h.ListAuthGroups, h.auth.Authorize, userManagePerm)
	group.POST("/auth_group/create", h.CreateAuthGroup, h.auth.Authorize, userManagePerm)
	group.PUT("/auth_group/:id", h.UpdateAuthGroup, h.auth.Authorize, userManagePerm)
	group.DELETE("/auth_group/:id", h.DeleteAuthGroup, h.auth.Authorize, userManagePerm)

	// 用户与用户组关联
	group.GET("/groups", h.GetUserGroups, h.auth.Authorize, userManagePerm)
	group.PUT("/groups", h.UpdateUserGroups, h.auth.Authorize, userManagePerm)

	// Pro 版本用户组管理接口
	proGroup := e.Group("/api/pro/v1/auth/group", h.auth.Authorize, h.auth.ValidateUserRole(consts.UserRoleAdmin))
	proGroup.GET("/list", h.ListAuthGroups)

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

	authInfo := domain.GetAuthInfoFromCtx(c.Request().Context())
	if authInfo != nil {
		caller, err := h.usecase.GetUser(c.Request().Context(), authInfo.UserId)
		if err == nil && caller.Role != consts.UserRoleAdmin && req.Role == consts.UserRoleAdmin {
			return h.NewResponseWithError(c, "非超级管理员不能创建超级管理员", nil)
		}
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

	ctx := c.Request().Context()
	ip := c.RealIP()
	locked, remaining := h.rateLimiter.CheckIPLocked(ctx, ip)
	if locked {
		h.logger.Warn("IP is locked", "ip", ip, "remaining", remaining)
		return h.NewResponseWithError(c, fmt.Sprintf("账号已被锁定，请 %s 后重试", remaining.String()), nil)
	}

	token, err := h.usecase.VerifyUserAndGenerateToken(ctx, req)
	if err != nil {
		h.rateLimiter.LockAttempt(ctx, ip)
		return h.NewResponseWithError(c, "用户名或密码错误", err)
	}

	go func() {
		if err := h.rateLimiter.ResetLoginAttempts(context.Background(), ip); err != nil {
			h.logger.Error("failed to reset login attempts", "error", err, "ip", ip)
		}
	}()

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

	user, err := h.usecase.GetUser(c.Request().Context(), authInfo.UserId)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user", err)
	}

	userInfo := &v1.UserInfoResp{
		ID:         user.ID,
		Account:    user.Account,
		Role:       user.Role,
		IsToken:    authInfo.IsToken,
		LastAccess: &user.LastAccess,
		CreatedAt:  user.CreatedAt,
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

	// 非超级管理员没有改密码权限
	if user.Role != consts.UserRoleAdmin {
		return h.NewResponseWithErrCode(c, domain.ErrCodePermissionDenied)
	}

	// 获取目标用户信息
	targetUser, err := h.usecase.GetUser(ctx, req.ID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get target user", err)
	}

	// 超级管理员可以修改任何用户的密码（包括自己和其他管理员）
	// 允许 admin 用户修改自己的密码
	if targetUser.Role == consts.UserRoleAdmin && targetUser.ID != authInfo.UserId {
		// 超级管理员不能改其他超级管理员密码（除了自己）
		return h.NewResponseWithError(c, "无法修改其他超级管理员密码", nil)
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
//	@Param			params	query		v1.DeleteUserReq	true	"DeleteUser Request"
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
		targetUser, err := h.usecase.GetUser(ctx, req.UserID)
		if err != nil {
			return h.NewResponseWithError(c, "failed to get target user", err)
		}
		if targetUser.Role == consts.UserRoleAdmin {
			return h.NewResponseWithError(c, "非超级管理员不能删除超级管理员", nil)
		}
	}

	err = h.usecase.DeleteUser(ctx, req.UserID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete user", err)
	}

	return h.NewResponseWithData(c, nil)
}

// ListGuestUsers
//
//	@Summary		ListGuestUsers
//	@Description	ListGuestUsers
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.PWResponse{data=v1.UserListResp}
//	@Router			/api/v1/user/guest/list [get]
func (h *UserHandler) ListGuestUsers(c echo.Context) error {
	users, err := h.usecase.ListGuestUsers(c.Request().Context())
	if err != nil {
		return h.NewResponseWithError(c, "failed to list guest users", err)
	}
	return h.NewResponseWithData(c, users)
}

// CreateGuestUser
//
//	@Summary		CreateGuestUser
//	@Description	CreateGuestUser
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CreateUserReq	true	"CreateGuestUser Request"
//	@Success		200		{object}	domain.Response{data=v1.CreateUserResp}
//	@Router			/api/v1/user/guest/create [post]
func (h *UserHandler) CreateGuestUser(c echo.Context) error {
	var req v1.CreateUserReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	// 强制设置为 guest 角色
	req.Role = consts.UserRoleGuest

	uid := uuid.New().String()
	err := h.usecase.CreateUser(c.Request().Context(), &domain.User{
		ID:       uid,
		Account:  req.Account,
		Password: req.Password,
		Role:     req.Role,
	}, consts.GetLicenseEdition(c))
	if err != nil {
		return h.NewResponseWithError(c, "failed to create guest user", err)
	}

	return h.NewResponseWithData(c, v1.CreateUserResp{ID: uid})
}

// UpdateGuestUser
//
//	@Summary		UpdateGuestUser
//	@Description	UpdateGuestUser
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			id		path		string				true	"User ID"
//	@Param			body	body		v1.CreateUserReq	true	"UpdateGuestUser Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/user/guest/:id [put]
func (h *UserHandler) UpdateGuestUser(c echo.Context) error {
	userID := c.Param("id")
	if userID == "" {
		return h.NewResponseWithError(c, "user id is required", nil)
	}

	var req v1.CreateUserReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	// 验证用户是否存在且为 guest 角色
	targetUser, err := h.usecase.GetUser(c.Request().Context(), userID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user", err)
	}

	if targetUser.Role != consts.UserRoleGuest {
		return h.NewResponseWithError(c, "只能更新访客用户", nil)
	}

	// 更新密码
	if req.Password != "" {
		err = h.usecase.ResetPassword(c.Request().Context(), &v1.ResetPasswordReq{
			ID:          userID,
			NewPassword: req.Password,
		})
		if err != nil {
			return h.NewResponseWithError(c, "failed to update password", err)
		}
	}

	return h.NewResponseWithData(c, nil)
}

// DeleteGuestUser
//
//	@Summary		DeleteGuestUser
//	@Description	DeleteGuestUser
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			id	path		string	true	"User ID"
//	@Success		200	{object}	domain.Response
//	@Router			/api/v1/user/guest/:id [delete]
func (h *UserHandler) DeleteGuestUser(c echo.Context) error {
	userID := c.Param("id")
	if userID == "" {
		return h.NewResponseWithError(c, "user id is required", nil)
	}

	// 验证用户是否存在且为 guest 角色
	targetUser, err := h.usecase.GetUser(c.Request().Context(), userID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user", err)
	}

	if targetUser.Role != consts.UserRoleGuest {
		return h.NewResponseWithError(c, "只能删除访客用户", nil)
	}

	err = h.usecase.DeleteUser(c.Request().Context(), userID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete guest user", err)
	}

	return h.NewResponseWithData(c, nil)
}

// ListAuthGroups
//
//	@Summary		ListAuthGroups
//	@Description	ListAuthGroups
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			kb_id	query		string	false	"Knowledge Base ID"
//	@Success		200		{object}	domain.PWResponse{data=v1.AuthGroupListResp}
//	@Router			/api/v1/user/auth_group/list [get]
//	@Router			/api/pro/v1/auth/group/list [get]
func (h *UserHandler) ListAuthGroups(c echo.Context) error {
	kbID := c.QueryParam("kb_id")
	groups, err := h.authUsecase.ListAuthGroups(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to list auth groups", err)
	}

	// 构建 ID 到用户组的映射，用于计算路径
	groupMap := make(map[uint]*domain.AuthGroup)
	for i := range groups {
		groupMap[groups[i].ID] = &groups[i]
	}

	// 计算每个用户组的路径
	buildPath := func(group *domain.AuthGroup) string {
		var pathParts []string
		currentGroup := group
		visited := make(map[uint]bool) // 防止循环引用
		maxDepth := 10                  // 限制最大深度

		for depth := 0; depth < maxDepth && currentGroup != nil; depth++ {
			if visited[currentGroup.ID] {
				break // 检测到循环，停止
			}
			visited[currentGroup.ID] = true
			pathParts = append(pathParts, currentGroup.Name)

			if currentGroup.ParentID == nil {
				break
			}
			parent, exists := groupMap[*currentGroup.ParentID]
			if !exists {
				break
			}
			currentGroup = parent
		}

		// 反转路径部分，因为是从子到父遍历的
		for i, j := 0, len(pathParts)-1; i < j; i, j = i+1, j-1 {
			pathParts[i], pathParts[j] = pathParts[j], pathParts[i]
		}

		if len(pathParts) == 0 {
			return ""
		}
		return "/" + strings.Join(pathParts, "/")
	}

	// 转换为响应格式
	resp := make([]v1.AuthGroupListItemResp, 0, len(groups))
	for _, group := range groups {
		authIDs := make([]int64, len(group.AuthIDs))
		for i, id := range group.AuthIDs {
			authIDs[i] = int64(id)
		}
		path := buildPath(&group)
		// 如果路径为空，使用名称作为路径
		if path == "" {
			path = group.Name
		}
		userIDs := make([]string, len(group.UserIDs))
		for i, id := range group.UserIDs {
			userIDs[i] = string(id)
		}
		resp = append(resp, v1.AuthGroupListItemResp{
			ID:        group.ID,
			Name:      group.Name,
			KbID:      group.KbID,
			ParentID:  group.ParentID,
			Position:  group.Position,
			AuthIDs:   authIDs,
			UserIDs:   userIDs,
			Path:      path,
			CreatedAt: group.CreatedAt,
			UpdatedAt: group.UpdatedAt,
		})
	}

	return h.NewResponseWithData(c, v1.AuthGroupListResp{
		Groups: resp,
		List:   resp, // 兼容前端类型定义
	})
}

// CreateAuthGroup
//
//	@Summary		CreateAuthGroup
//	@Description	CreateAuthGroup
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CreateAuthGroupReq	true	"CreateAuthGroup Request"
//	@Success		200		{object}	domain.Response{data=v1.CreateAuthGroupResp}
//	@Router			/api/v1/user/auth_group/create [post]
func (h *UserHandler) CreateAuthGroup(c echo.Context) error {
	var req v1.CreateAuthGroupReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	// 转换 auth_ids 和 user_ids
	authIDs := pq.Int64Array(req.AuthIDs)
	userIDs := pq.StringArray(req.UserIDs)

	group := &domain.AuthGroup{
		Name:       req.Name,
		KbID:       req.KbID,
		ParentID:   req.ParentID,
		Position:   req.Position,
		AuthIDs:    authIDs,
		UserIDs:    userIDs,
		SourceType: consts.SourceTypeOAuth, // 使用 OAuth 作为默认类型
	}

	err := h.authUsecase.CreateAuthGroup(c.Request().Context(), group)
	if err != nil {
		return h.NewResponseWithError(c, "failed to create auth group", err)
	}

	return h.NewResponseWithData(c, v1.CreateAuthGroupResp{ID: group.ID})
}

// UpdateAuthGroup
//
//	@Summary		UpdateAuthGroup
//	@Description	UpdateAuthGroup
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			id		path		uint					true	"Auth Group ID"
//	@Param			body	body		v1.UpdateAuthGroupReq	true	"UpdateAuthGroup Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/user/auth_group/:id [put]
func (h *UserHandler) UpdateAuthGroup(c echo.Context) error {
	var id uint
	if err := echo.PathParamsBinder(c).Uint("id", &id).BindError(); err != nil {
		return h.NewResponseWithError(c, "invalid group id", err)
	}

	var req v1.UpdateAuthGroupReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	// 验证用户组是否存在
	_, err := h.authUsecase.GetAuthGroup(c.Request().Context(), id)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get auth group", err)
	}

	// 转换 auth_ids 和 user_ids
	authIDs := pq.Int64Array(req.AuthIDs)
	userIDs := pq.StringArray(req.UserIDs)

	group := &domain.AuthGroup{
		Name:     req.Name,
		ParentID: req.ParentID,
		Position: req.Position,
		AuthIDs:  authIDs,
		UserIDs:  userIDs,
	}

	err = h.authUsecase.UpdateAuthGroup(c.Request().Context(), id, group)
	if err != nil {
		return h.NewResponseWithError(c, "failed to update auth group", err)
	}

	return h.NewResponseWithData(c, nil)
}

// DeleteAuthGroup
//
//	@Summary		DeleteAuthGroup
//	@Description	DeleteAuthGroup
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			id	path		uint	true	"Auth Group ID"
//	@Success		200	{object}	domain.Response
//	@Router			/api/v1/user/auth_group/:id [delete]
func (h *UserHandler) DeleteAuthGroup(c echo.Context) error {
	var id uint
	if err := echo.PathParamsBinder(c).Uint("id", &id).BindError(); err != nil {
		return h.NewResponseWithError(c, "invalid group id", err)
	}

	err := h.authUsecase.DeleteAuthGroup(c.Request().Context(), id)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete auth group", err)
	}

	return h.NewResponseWithData(c, nil)
}

// GetUserGroups
//
//	@Summary		GetUserGroups
//	@Description	GetUserGroups - 获取用户所属的用户组
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			user_id	query		string	true	"User ID"
//	@Success		200		{object}	domain.PWResponse{data=v1.GetUserGroupsResp}
//	@Router			/api/v1/user/groups [get]
func (h *UserHandler) GetUserGroups(c echo.Context) error {
	userID := c.QueryParam("user_id")
	if userID == "" {
		return h.NewResponseWithError(c, "user_id is required", nil)
	}

	groups, err := h.authUsecase.GetUserGroups(c.Request().Context(), userID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get user groups", err)
	}

	// 构建 ID 到用户组的映射，用于计算路径
	groupMap := make(map[uint]*domain.AuthGroup)
	for i := range groups {
		groupMap[groups[i].ID] = &groups[i]
	}

	// 计算每个用户组的路径
	buildPath := func(group *domain.AuthGroup) string {
		var pathParts []string
		currentGroup := group
		visited := make(map[uint]bool)
		maxDepth := 10

		for depth := 0; depth < maxDepth && currentGroup != nil; depth++ {
			if visited[currentGroup.ID] {
				break
			}
			visited[currentGroup.ID] = true
			pathParts = append(pathParts, currentGroup.Name)

			if currentGroup.ParentID == nil {
				break
			}
			parent, exists := groupMap[*currentGroup.ParentID]
			if !exists {
				break
			}
			currentGroup = parent
		}

		for i, j := 0, len(pathParts)-1; i < j; i, j = i+1, j-1 {
			pathParts[i], pathParts[j] = pathParts[j], pathParts[i]
		}

		if len(pathParts) == 0 {
			return ""
		}
		return "/" + strings.Join(pathParts, "/")
	}

	resp := make([]v1.AuthGroupListItemResp, 0, len(groups))
	for _, group := range groups {
		authIDs := make([]int64, len(group.AuthIDs))
		for i, id := range group.AuthIDs {
			authIDs[i] = int64(id)
		}
		userIDs := make([]string, len(group.UserIDs))
		for i, id := range group.UserIDs {
			userIDs[i] = string(id)
		}
		path := buildPath(&group)
		if path == "" {
			path = group.Name
		}
		resp = append(resp, v1.AuthGroupListItemResp{
			ID:        group.ID,
			Name:      group.Name,
			KbID:      group.KbID,
			ParentID:  group.ParentID,
			Position:  group.Position,
			AuthIDs:   authIDs,
			UserIDs:   userIDs,
			Path:      path,
			CreatedAt: group.CreatedAt,
			UpdatedAt: group.UpdatedAt,
		})
	}

	return h.NewResponseWithData(c, v1.GetUserGroupsResp{Groups: resp})
}

// UpdateUserGroups
//
//	@Summary		UpdateUserGroups
//	@Description	UpdateUserGroups - 更新用户所属的用户组
//	@Tags			user
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.UpdateUserGroupsReq	true	"UpdateUserGroups Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/user/groups [put]
func (h *UserHandler) UpdateUserGroups(c echo.Context) error {
	var req v1.UpdateUserGroupsReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	err := h.authUsecase.UpdateUserGroups(c.Request().Context(), req.UserID, req.GroupIDs)
	if err != nil {
		return h.NewResponseWithError(c, "failed to update user groups", err)
	}

	return h.NewResponseWithData(c, nil)
}
