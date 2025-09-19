package v1

import (
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/kb/v1"
	"github.com/chaitin/panda-wiki/consts"
)

// KBUserList
//
//	@Summary		KBUserList
//	@Description	KBUserList
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			kb_id	query		string	true	"Knowledge Base ID"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.KBUserListItemResp}
//	@Router			/api/v1/knowledge_base/user/list [get]
func (h *KnowledgeBaseHandler) KBUserList(c echo.Context) error {
	var req v1.KBUserListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request params is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}

	resp, err := h.usecase.GetKBUserList(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "get kb user list failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// KBUserInvite
//
//	@Summary		KBUserInvite
//	@Description	Invite user to knowledge base
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			param	body		v1.KBUserInviteReq	true	"Invite User Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base/user/invite [post]
func (h *KnowledgeBaseHandler) KBUserInvite(c echo.Context) error {
	var req v1.KBUserInviteReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}

	if consts.GetLicenseEdition(c) != consts.LicenseEditionEnterprise && req.Perm != consts.UserKBPermissionFullControl {
		return h.NewResponseWithError(c, "非企业版本只能使用完全控制权限", nil)
	}

	err := h.usecase.KBUserInvite(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "invite user to kb failed", err)
	}

	return h.NewResponseWithData(c, nil)
}

// KBUserUpdate
//
//	@Summary		KBUserUpdate
//	@Description	Update user permission in knowledge base
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			param	body		v1.KBUserUpdateReq	true	"Update User Permission Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base/user/update [patch]
func (h *KnowledgeBaseHandler) KBUserUpdate(c echo.Context) error {
	var req v1.KBUserUpdateReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}

	if consts.GetLicenseEdition(c) != consts.LicenseEditionEnterprise && req.Perm != consts.UserKBPermissionFullControl {
		return h.NewResponseWithError(c, "非企业版本只能使用完全控制权限", nil)
	}

	err := h.usecase.UpdateUserKB(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "update user kb permission failed", err)
	}

	return h.NewResponseWithData(c, nil)
}

// KBUserDelete
//
//	@Summary		KBUserDelete
//	@Description	Remove user from knowledge base
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			param	query		v1.KBUserDeleteReq	true	"Remove User Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base/user/delete [delete]
func (h *KnowledgeBaseHandler) KBUserDelete(c echo.Context) error {
	var req v1.KBUserDeleteReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}

	err := h.usecase.KBUserDelete(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "remove user from kb failed", err)
	}

	return h.NewResponseWithData(c, nil)
}
