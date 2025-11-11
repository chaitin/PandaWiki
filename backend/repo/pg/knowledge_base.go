package pg

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"net"
	"net/http"
	"time"

	"strconv"

	"github.com/google/go-cmp/cmp"
	"github.com/google/uuid"
	"github.com/samber/lo"
	"gorm.io/gorm"

	v1 "github.com/chaitin/panda-wiki/api/kb/v1"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
	"github.com/chaitin/panda-wiki/store/rag"
)

type KnowledgeBaseRepository struct {
	db     *pg.DB
	config *config.Config
	logger *log.Logger
	rag    rag.RAGService
}

func NewKnowledgeBaseRepository(db *pg.DB, config *config.Config, logger *log.Logger, rag rag.RAGService) *KnowledgeBaseRepository {
	r := &KnowledgeBaseRepository{
		db:     db,
		config: config,
		logger: logger.WithModule("repo.pg.knowledge_base"),
		rag:    rag,
	}
	ctx := context.Background()
	kbList, err := r.GetKnowledgeBaseList(ctx)
	if err != nil {
		r.logger.Error("failed to get knowledge base list", "error", err)
		return r
	}
	if len(kbList) > 0 {
		if err := r.SyncKBAccessSettingsToCaddy(ctx, kbList); err != nil {
			r.logger.Error("failed to sync kb access settings to caddy", "error", err)
		}
	}
	return r
}

func (r *KnowledgeBaseRepository) SyncKBAccessSettingsToCaddy(ctx context.Context, kbList []*domain.KnowledgeBaseListItem) error {
	if len(kbList) == 0 {
		return nil
	}
	firstKB := kbList[0]
	firstHost := ""
	if len(firstKB.AccessSettings.Hosts) > 0 {
		firstHost = firstKB.AccessSettings.Hosts[0]
	}
	certs := make([]map[string]any, 0)
	portHostKBMap := make(map[string]map[string]*domain.KnowledgeBaseListItem)
	httpPorts := make(map[string]struct{})
	for _, kb := range kbList {
		for _, port := range kb.AccessSettings.Ports {
			httpPorts[fmt.Sprintf(":%d", port)] = struct{}{}
			if _, ok := portHostKBMap[fmt.Sprintf(":%d", port)]; !ok {
				portHostKBMap[fmt.Sprintf(":%d", port)] = make(map[string]*domain.KnowledgeBaseListItem)
			}
			for _, host := range kb.AccessSettings.Hosts {
				portHostKBMap[fmt.Sprintf(":%d", port)][host] = kb
			}
		}
		for _, sslPort := range kb.AccessSettings.SSLPorts {
			if _, ok := portHostKBMap[fmt.Sprintf(":%d", sslPort)]; !ok {
				portHostKBMap[fmt.Sprintf(":%d", sslPort)] = make(map[string]*domain.KnowledgeBaseListItem)
			}
			for _, host := range kb.AccessSettings.Hosts {
				portHostKBMap[fmt.Sprintf(":%d", sslPort)][host] = kb
			}
		}
		if len(kb.AccessSettings.PublicKey) > 0 && len(kb.AccessSettings.PrivateKey) > 0 {
			certs = append(certs, map[string]any{
				"certificate": kb.AccessSettings.PublicKey,
				"key":         kb.AccessSettings.PrivateKey,
				"tags":        []string{kb.ID},
			})
		}
	}
	socketPath := r.config.CaddyAPI
	// sync kb to caddy
	// create server for each port
	subnetPrefix := r.config.SubnetPrefix
	if subnetPrefix == "" {
		subnetPrefix = "169.254.15"
	}
	api := fmt.Sprintf("%s.2:8000", subnetPrefix)
	app := fmt.Sprintf("%s.112:3010", subnetPrefix)
	staticFile := fmt.Sprintf("%s.12:9000", subnetPrefix) // minio
	servers := make(map[string]any, 0)
	for port, hostKBMap := range portHostKBMap {
		trustProxies := make([]string, 0)
		for _, kb := range hostKBMap {
			trustProxies = append(trustProxies, kb.AccessSettings.TrustedProxies...)
		}
		server := map[string]any{
			"listen": []string{port},
			"routes": []map[string]any{},
		}
		if len(trustProxies) != 0 {
			trustProxies = lo.Uniq(trustProxies)
			server["trusted_proxies"] = map[string]any{
				"source": "static",
				"ranges": trustProxies,
			}
		}
		if _, ok := httpPorts[port]; ok {
			server["automatic_https"] = map[string]any{
				"disable": true,
			}
		} else {
			server["automatic_https"] = map[string]any{
				"disable_certificates": true,
				"disable_redirects":    true,
			}
		}
		routes := make([]map[string]any, 0)
		var defaultRoute map[string]any
		for host, kb := range hostKBMap {
			route := map[string]any{
				"handle": []map[string]any{
					{
						"handler": "subroute",
						"routes": []map[string]any{
							{
								"match": []map[string]any{
									{
										"path": []string{"/share/v1/chat/message"},
									},
								},
								"handle": []map[string]any{
									{
										"handler": "headers",
										"request": map[string]any{
											"set": map[string][]any{
												"X-KB-ID": {kb.ID},
											},
										},
									},
									{
										"handler": "reverse_proxy",
										"upstreams": []map[string]any{
											{"dial": api},
										},
										"flush_interval": -1,
										"transport": map[string]any{
											"protocol":      "http",
											"read_timeout":  "10m",
											"write_timeout": "10m",
										},
									},
								},
							},
							{
								"match": []map[string]any{
									{
										"path": []string{"/share/v1/chat/completions", "/share/v1/app/wechat/app", "/share/v1/app/wechat/service", "/sitemap.xml", "/share/v1/app/wechat/official_account", "/share/v1/app/wechat/service/answer"},
									},
								},
								"handle": []map[string]any{
									{
										"handler": "headers",
										"request": map[string]any{
											"set": map[string][]any{
												"X-KB-ID": {kb.ID},
											},
										},
									},
									{
										"handler": "reverse_proxy",
										"upstreams": []map[string]any{
											{"dial": api},
										},
									},
								},
							},
							{
								"match": []map[string]any{
									{
										"path": []string{"/static-file/*"},
									},
								},
								"handle": []map[string]any{
									{
										"handler": "reverse_proxy",
										"upstreams": []map[string]any{
											{"dial": staticFile},
										},
										"flush_interval": -1,
										"transport": map[string]any{
											"protocol":      "http",
											"read_timeout":  "10m",
											"write_timeout": "10m",
										},
									},
								},
							},
							{
								"handle": []map[string]any{
									{
										"handler": "headers",
										"request": map[string]any{
											"set": map[string][]any{
												"X-KB-ID": {kb.ID},
											},
										},
									},
									{
										"handler": "reverse_proxy",
										"upstreams": []map[string]any{
											{"dial": app},
										},
									},
								},
							},
						},
					},
				},
			}
			if host == firstHost {
				// first host as default host
				// copy route without the host match
				defaultRoute = maps.Clone(route)
			}
			if host != "*" {
				route["match"] = []map[string]any{
					{
						"host": []string{host},
					},
				}
			}
			routes = append(routes, route)
		}
		// add default route if exists
		if defaultRoute != nil {
			routes = append(routes, defaultRoute)
		}
		server["routes"] = routes
		servers[port] = server
	}
	apps := map[string]any{
		"http": map[string]any{
			"servers": servers,
		},
	}
	if len(certs) > 0 {
		apps["tls"] = map[string]any{
			"certificates": map[string]any{
				"load_pem": certs,
			},
		}
	}
	config := map[string]any{
		"apps": apps,
	}
	newBody, _ := json.Marshal(config)
	tr := &http.Transport{
		DialContext: func(_ context.Context, _, _ string) (net.Conn, error) {
			return net.Dial("unix", socketPath)
		},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   5 * time.Second,
	}
	req, err := http.NewRequest("POST", "http://unix/load", bytes.NewBuffer(newBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		r.logger.Error("failed to update caddy config", "error", string(body))
		return domain.ErrSyncCaddyConfigFailed
	}
	return nil
}

func (r *KnowledgeBaseRepository) CreateKnowledgeBase(ctx context.Context, maxKB int, kb *domain.KnowledgeBase) error {
	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return fmt.Errorf("authInfo not found in context")
	}
	if authInfo.IsToken {
		return fmt.Errorf("this api not support token call")
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(kb).Error; err != nil {
			return err
		}
		// get all kb list
		var kbs []*domain.KnowledgeBaseListItem
		if err := tx.Model(&domain.KnowledgeBase{}).
			Order("created_at ASC").
			Find(&kbs).Error; err != nil {
			return err
		}
		if len(kbs) > maxKB {
			return errors.New("kb is too many, maxKB: " + strconv.Itoa(maxKB))
		}

		if err := r.checkUniquePortHost(kbs); err != nil {
			return err
		}
		if err := r.SyncKBAccessSettingsToCaddy(ctx, kbs); err != nil {
			r.logger.Error("failed to sync kb access settings to caddy", "error", err)
			return err
		}
		type AppBtn struct {
			ID       string `json:"id"`
			Icon     string `json:"icon"`
			ShowIcon bool   `json:"showIcon"`
			Target   string `json:"target"`
			Text     string `json:"text"`
			URL      string `json:"url"`
			Variant  string `json:"variant"`
		}
		if err := tx.Create(&domain.App{
			ID:   uuid.New().String(),
			KBID: kb.ID,
			Name: kb.Name,
			Type: domain.AppTypeWeb,
			Settings: domain.AppSettings{
				Title:      kb.Name,
				Desc:       kb.Name,
				Keyword:    kb.Name,
				Icon:       domain.DefaultPandaWikiIconB64,
				WelcomeStr: fmt.Sprintf("欢迎使用%s", kb.Name),
				Btns: []any{
					AppBtn{
						ID:       uuid.New().String(),
						Icon:     domain.DefaultGitHubIconB64,
						ShowIcon: true,
						Target:   "_blank",
						Text:     "GitHub",
						URL:      "https://ly.safepoint.cloud/XEyeWqL",
						Variant:  "contained",
					},
					AppBtn{
						ID:       uuid.New().String(),
						Icon:     "",
						ShowIcon: false,
						Target:   "_blank",
						Text:     "PandaWiki",
						URL:      "https://pandawiki.docs.baizhi.cloud",
						Variant:  "outlined",
					},
				},
			},
		}).Error; err != nil {
			return err
		}
		var user domain.User
		err := r.db.WithContext(ctx).
			Where("id = ?", authInfo.UserId).
			First(&user).Error
		if err != nil {
			return err
		}

		// 非管理员用户需要user到kb创建映射关系
		if user.Role != consts.UserRoleAdmin {
			if err := r.CreateKBUser(ctx, &domain.KBUsers{
				KBId:   kb.ID,
				UserId: authInfo.UserId,
				Perm:   consts.UserKBPermissionFullControl,
			}); err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *KnowledgeBaseRepository) checkUniquePortHost(kbList []*domain.KnowledgeBaseListItem) error {
	uniqPortHost := make(map[string]bool)
	for _, kb := range kbList {
		for _, port := range kb.AccessSettings.Ports {
			for _, host := range kb.AccessSettings.Hosts {
				portHostStr := fmt.Sprintf("%d%s", port, host)
				if _, ok := uniqPortHost[portHostStr]; !ok {
					uniqPortHost[portHostStr] = true
				} else {
					r.logger.Error("port and host already exists", "port", port, "host", host)
					return domain.ErrPortHostAlreadyExists
				}
			}
		}
		for _, sslPort := range kb.AccessSettings.SSLPorts {
			for _, host := range kb.AccessSettings.Hosts {
				portHostStr := fmt.Sprintf("%d%s", sslPort, host)
				if _, ok := uniqPortHost[portHostStr]; !ok {
					uniqPortHost[portHostStr] = true
				} else {
					r.logger.Error("port and host already exists", "port", sslPort, "host", host)
					return domain.ErrPortHostAlreadyExists
				}
			}
		}
	}
	return nil
}

func (r *KnowledgeBaseRepository) GetKnowledgeBaseList(ctx context.Context) ([]*domain.KnowledgeBaseListItem, error) {
	var kbs []*domain.KnowledgeBaseListItem
	if err := r.db.WithContext(ctx).
		Model(&domain.KnowledgeBase{}).
		Order("created_at ASC").
		Find(&kbs).Error; err != nil {
		return nil, err
	}
	return kbs, nil
}

func (r *KnowledgeBaseRepository) GetKnowledgeBaseIds(ctx context.Context) ([]string, error) {
	var ids []string
	if err := r.db.WithContext(ctx).
		Model(&domain.KnowledgeBase{}).
		Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func (r *KnowledgeBaseRepository) GetKnowledgeBaseListByUserId(ctx context.Context) ([]*domain.KnowledgeBaseListItem, error) {
	kbs := make([]*domain.KnowledgeBaseListItem, 0)
	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return nil, fmt.Errorf("authInfo not found in context")
	}

	if authInfo.IsToken {
		if err := r.db.WithContext(ctx).
			Model(&domain.KnowledgeBase{}).
			Where("id = ?", authInfo.KBId).
			Order("created_at ASC").
			Find(&kbs).Error; err != nil {
			return nil, err
		}
	} else {
		var user domain.User
		err := r.db.WithContext(ctx).
			Where("id = ?", authInfo.UserId).
			First(&user).Error
		if err != nil {
			return nil, err
		}

		if user.Role == consts.UserRoleAdmin {
			if err := r.db.WithContext(ctx).
				Model(&domain.KnowledgeBase{}).
				Order("created_at ASC").
				Find(&kbs).Error; err != nil {
				return nil, err
			}
		} else {
			var kbIDs []string
			if err := r.db.WithContext(ctx).
				Table("kb_users").
				Where("user_id = ?", authInfo.UserId).
				Pluck("kb_id", &kbIDs).Error; err != nil {
				return nil, err
			}
			if len(kbIDs) > 0 {
				if err := r.db.WithContext(ctx).
					Model(&domain.KnowledgeBase{}).
					Where("id IN ?", kbIDs).
					Order("created_at ASC").
					Find(&kbs).Error; err != nil {
					return nil, err
				}
			}
		}
	}

	return kbs, nil
}

func (r *KnowledgeBaseRepository) UpdateDatasetID(ctx context.Context, kbID, datasetID string) error {
	return r.db.WithContext(ctx).
		Model(&domain.KnowledgeBase{}).
		Where("id = ?", kbID).
		Update("dataset_id", datasetID).Error
}

func (r *KnowledgeBaseRepository) UpdateKnowledgeBase(ctx context.Context, req *domain.UpdateKnowledgeBaseReq) (bool, error) {
	var isChanged bool
	kb, err := r.GetKnowledgeBaseByID(ctx, req.ID)
	if err != nil {
		return false, err
	}

	updateMap := map[string]any{}
	if req.Name != nil {
		updateMap["name"] = req.Name
	}
	if req.AccessSettings != nil {
		updateMap["access_settings"] = req.AccessSettings
	}

	if err = r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.KnowledgeBase{}).Where("id = ?", req.ID).Updates(updateMap).Error; err != nil {
			return err
		}
		// get all kb list
		var kbs []*domain.KnowledgeBaseListItem
		if err := tx.Model(&domain.KnowledgeBase{}).
			Order("created_at ASC").
			Find(&kbs).Error; err != nil {
			return err
		}
		if err := r.checkUniquePortHost(kbs); err != nil {
			return err
		}
		if err := r.SyncKBAccessSettingsToCaddy(ctx, kbs); err != nil {
			return fmt.Errorf("failed to sync kb access settings to caddy: %w", err)
		}
		return nil
	}); err != nil {
		return false, err
	}

	kbNew, err := r.GetKnowledgeBaseByID(ctx, req.ID)
	if err != nil {
		return false, err
	}

	if !cmp.Equal(kbNew.AccessSettings, kb.AccessSettings) {
		isChanged = true
	}

	return isChanged, nil
}

func (r *KnowledgeBaseRepository) GetKnowledgeBaseByID(ctx context.Context, kbID string) (*domain.KnowledgeBase, error) {
	var kb domain.KnowledgeBase
	if err := r.db.WithContext(ctx).Where("id = ?", kbID).First(&kb).Error; err != nil {
		return nil, err
	}
	return &kb, nil
}

func (r *KnowledgeBaseRepository) DeleteKnowledgeBase(ctx context.Context, kbID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("kb_id = ?", kbID).Delete(&domain.Node{}).Error; err != nil {
			return err
		}
		if err := tx.Where("kb_id = ?", kbID).Delete(&domain.App{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", kbID).Delete(&domain.KnowledgeBase{}).Error; err != nil {
			return err
		}
		// get all kb list
		var kbs []*domain.KnowledgeBaseListItem
		if err := tx.Model(&domain.KnowledgeBase{}).
			Order("created_at ASC").
			Find(&kbs).Error; err != nil {
			return err
		}
		if err := r.SyncKBAccessSettingsToCaddy(ctx, kbs); err != nil {
			return fmt.Errorf("failed to sync kb access settings to caddy: %w", err)
		}
		return nil
	})
}

func (r *KnowledgeBaseRepository) CreateKBRelease(ctx context.Context, release *domain.KBRelease) error {
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// create new release
		if err := tx.Create(release).Error; err != nil {
			return err
		}
		// create release node for all released nodes
		var nodeReleases []*domain.NodeRelease
		if err := tx.Where("kb_id = ?", release.KBID).
			Select("DISTINCT ON (node_id) id, node_id").
			Order("node_id, updated_at DESC").
			Find(&nodeReleases).Error; err != nil {
			return err
		}
		if len(nodeReleases) == 0 {
			return nil
		}
		kbReleaseNodeReleases := make([]*domain.KBReleaseNodeRelease, len(nodeReleases))
		for i, nodeRelease := range nodeReleases {
			kbReleaseNodeReleases[i] = &domain.KBReleaseNodeRelease{
				ID:            uuid.New().String(),
				KBID:          release.KBID,
				ReleaseID:     release.ID,
				NodeID:        nodeRelease.NodeID,
				NodeReleaseID: nodeRelease.ID,
				CreatedAt:     time.Now(),
			}
		}
		if err := tx.CreateInBatches(&kbReleaseNodeReleases, 100).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	return nil
}

func (r *KnowledgeBaseRepository) GetKBReleaseList(ctx context.Context, kbID string) (int64, []domain.KBReleaseListItemResp, error) {
	var total int64
	if err := r.db.Model(&domain.KBRelease{}).Where("kb_id = ?", kbID).Count(&total).Error; err != nil {
		return 0, nil, err
	}

	var releases []domain.KBReleaseListItemResp
	if err := r.db.Model(&domain.KBRelease{}).
		Where("kb_id = ?", kbID).
		Order("created_at DESC").
		Find(&releases).Error; err != nil {
		return 0, nil, err
	}

	return total, releases, nil
}

func (r *KnowledgeBaseRepository) GetLatestRelease(ctx context.Context, kbID string) (*domain.KBRelease, error) {
	var release domain.KBRelease
	if err := r.db.WithContext(ctx).
		Where("kb_id = ?", kbID).
		Order("created_at DESC").
		First(&release).Error; err != nil {
		return nil, err
	}
	return &release, nil
}

func (r *KnowledgeBaseRepository) GetKBUserlist(ctx context.Context, kbID string) ([]v1.KBUserListItemResp, error) {
	var users []v1.KBUserListItemResp
	err := r.db.WithContext(ctx).
		Model(&domain.User{}).
		Select("users.id, users.account, users.role, kbu.perm, kbu.created_at").
		Joins("INNER JOIN kb_users kbu ON users.id = kbu.user_id").
		Where("kbu.kb_id = ?", kbID).
		Where("users.role = ?", consts.UserRoleUser).
		Order("kbu.created_at DESC").
		Scan(&users).Error
	if err != nil {
		return nil, err
	}

	var adminUsers []v1.KBUserListItemResp
	err = r.db.WithContext(ctx).
		Model(&domain.User{}).
		Select("users.id, users.account, users.role").
		Where("users.role = ?", consts.UserRoleAdmin).
		Order("Users.id DESC").
		Scan(&adminUsers).Error
	if err != nil {
		return nil, err
	}
	for index := range adminUsers {
		adminUsers[index].Perm = consts.UserKBPermissionFullControl
	}

	users = append(users, adminUsers...)
	return users, nil
}

func (r *KnowledgeBaseRepository) CreateKBUser(ctx context.Context, kbUser *domain.KBUsers) error {

	return r.db.WithContext(ctx).Create(kbUser).Error
}

func (r *KnowledgeBaseRepository) UpdateKBUserPerm(ctx context.Context, kbId, userId string, perm consts.UserKBPermission) error {
	return r.db.WithContext(ctx).
		Model(&domain.KBUsers{}).
		Where("kb_id = ? AND user_id = ?", kbId, userId).
		Update("perm", perm).Error
}

func (r *KnowledgeBaseRepository) DeleteKBUser(ctx context.Context, kbId, userId string) error {
	return r.db.WithContext(ctx).
		Where("kb_id = ? AND user_id = ?", kbId, userId).
		Delete(&domain.KBUsers{}).Error
}

func (r *KnowledgeBaseRepository) GetKBUser(ctx context.Context, kbId, userId string) (*domain.KBUsers, error) {
	var users domain.KBUsers
	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND user_id = ?", kbId, userId).
		First(&users).Error
	if err != nil {
		return nil, err
	}
	return &users, err
}

func (r *KnowledgeBaseRepository) GetKBPermByUserId(ctx context.Context, kbId string) (consts.UserKBPermission, error) {
	authInfo := domain.GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return "", fmt.Errorf("authInfo not found in context")
	}

	var (
		user domain.User
		perm consts.UserKBPermission
	)

	if authInfo.IsToken {
		if authInfo.KBId != kbId {
			return "", errors.New("token kb permission denied")
		}

		return authInfo.Permission, nil
	} else {
		if err := r.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", authInfo.UserId).First(&user).Error; err != nil {
			return perm, err
		}
		if user.Role == consts.UserRoleAdmin {
			return consts.UserKBPermissionFullControl, nil
		}
		kbUser, err := r.GetKBUser(ctx, kbId, authInfo.UserId)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return consts.UserKBPermissionNull, nil
			}
			return perm, err
		}

		return kbUser.Perm, nil
	}
}
