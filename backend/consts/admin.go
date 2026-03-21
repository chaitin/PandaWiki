package consts

type UserKBPermission string

const (
	UserKBPermissionNull        UserKBPermission = ""             // 无权限
	UserKBPermissionFullControl UserKBPermission = "full_control" // 完全控制
	UserKBPermissionDocManage   UserKBPermission = "doc_manage"   // 文档管理
	UserKBPermissionDataOperate UserKBPermission = "data_operate" // 数据运营
	UserKBPermissionAuditManage UserKBPermission = "audit_manage" // 审核管理（发布文档）
	UserKBPermissionUserManage  UserKBPermission = "user_manage"  // 用户管理
)

type UserKBPermissions []UserKBPermission

func (p UserKBPermissions) Contains(perm UserKBPermission) bool {
	for _, v := range p {
		if v == perm || v == UserKBPermissionFullControl {
			return true
		}
	}
	return false
}

type UserRole string

const (
	UserRoleAdmin UserRole = "admin" // 管理员
	UserRoleUser  UserRole = "user"  // 普通用户
	UserRoleGuest UserRole = "guest"  // 访客用户
)
