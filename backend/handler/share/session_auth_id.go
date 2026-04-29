package share

import (
	"strconv"
	"strings"

	"github.com/gorilla/sessions"
)

// sessionAuthUserIDString 从 gorilla session 中解析 auths 主键（与 SaveNewSession 写入的 user_id 一致）。
// Redis 等存储反序列化后类型可能不是 uint，需兼容多种数值与字符串形态。
func sessionAuthUserIDString(sess *sessions.Session) (string, bool) {
	v, ok := sess.Values["user_id"]
	if !ok || v == nil {
		return "", false
	}
	switch x := v.(type) {
	case uint:
		if x == 0 {
			return "", false
		}
		return strconv.FormatUint(uint64(x), 10), true
	case uint32:
		if x == 0 {
			return "", false
		}
		return strconv.FormatUint(uint64(x), 10), true
	case uint64:
		if x == 0 {
			return "", false
		}
		return strconv.FormatUint(x, 10), true
	case int:
		if x <= 0 {
			return "", false
		}
		return strconv.FormatInt(int64(x), 10), true
	case int32:
		if x <= 0 {
			return "", false
		}
		return strconv.FormatInt(int64(x), 10), true
	case int64:
		if x <= 0 {
			return "", false
		}
		return strconv.FormatInt(x, 10), true
	case float64:
		if x <= 0 || x != float64(int64(x)) {
			return "", false
		}
		return strconv.FormatInt(int64(x), 10), true
	case float32:
		if x <= 0 {
			return "", false
		}
		return strconv.FormatInt(int64(x), 10), true
	case string:
		s := strings.TrimSpace(x)
		if s == "" {
			return "", false
		}
		return s, true
	default:
		return "", false
	}
}

func sessionKbIDString(sess *sessions.Session) (string, bool) {
	v, ok := sess.Values["kb_id"]
	if !ok || v == nil {
		return "", false
	}
	switch x := v.(type) {
	case string:
		s := strings.TrimSpace(x)
		if s == "" {
			return "", false
		}
		return s, true
	case []byte:
		s := strings.TrimSpace(string(x))
		if s == "" {
			return "", false
		}
		return s, true
	default:
		return "", false
	}
}
