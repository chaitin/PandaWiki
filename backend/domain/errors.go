package domain

import "errors"

var ErrModelNotConfigured = errors.New("model not configured")

var ErrPortHostAlreadyExists = errors.New("port and host already exists")

var ErrSyncCaddyConfigFailed = errors.New("failed to sync caddy config")

var ErrNodeParentIDInIDs = errors.New("node.parent_id in ids, can't delete")
