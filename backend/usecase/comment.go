package usecase

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/samber/lo"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/ipdb"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type CommentUsecase struct {
	logger      *log.Logger
	CommentRepo *pg.CommentRepository
	NodeRepo    *pg.NodeRepository
	ipRepo      *ipdb.IPAddressRepo
}

func NewCommentUsecase(commentRepo *pg.CommentRepository, logger *log.Logger,
	nodeRepo *pg.NodeRepository, ipRepo *ipdb.IPAddressRepo) *CommentUsecase {
	return &CommentUsecase{
		logger:      logger.WithModule("usecase.comment"),
		CommentRepo: commentRepo,
		NodeRepo:    nodeRepo,
		ipRepo:      ipRepo,
	}
}

func (u *CommentUsecase) CreateComment(ctx context.Context, commentReq *domain.CommentReq, KbID string, remoteIP string) (string, error) {
	// node
	if _, err := u.NodeRepo.GetNodeByID(ctx, commentReq.NodeID); err != nil {
		return "", err
	}

	// 构造结构体给下方数据库进行插入
	CommentID, err := uuid.NewV7()
	if err != nil {
		return "", err
	}
	CommentStr := CommentID.String()

	err = u.CommentRepo.CreateComment(ctx, &domain.Comment{
		ID:     CommentStr,
		NodeID: commentReq.NodeID,
		Info: domain.CommentInfo{
			UserName: commentReq.UserName,
			RemoteIP: remoteIP,
		},
		ParentID:  commentReq.ParentID,
		RootID:    commentReq.RootID,
		Content:   commentReq.Content,
		CreatedAt: time.Now(),
		KbID:      KbID,
	})
	if err != nil {
		return "", err
	}

	// success
	return CommentStr, nil
}

func (u *CommentUsecase) GetCommentListByNodeID(ctx context.Context, nodeID string) (*domain.PaginatedResult[[]*domain.ShareCommentListItem], error) {
	comments, total, err := u.CommentRepo.GetCommentList(ctx, nodeID)
	if err != nil {
		return nil, err
	}
	// get ip address
	ipAddressMap := make(map[string]*domain.IPAddress)
	lo.Map(comments, func(comment *domain.ShareCommentListItem, _ int) *domain.ShareCommentListItem {
		if _, ok := ipAddressMap[comment.Info.RemoteIP]; !ok {
			ipAddress, err := u.ipRepo.GetIPAddress(ctx, comment.Info.RemoteIP)
			if err != nil {
				u.logger.Error("get ip address failed", log.Error(err), log.String("ip", comment.Info.RemoteIP))
				return comment
			}
			ipAddressMap[comment.Info.RemoteIP] = ipAddress
			comment.IPAddress = ipAddress
			comment.Info.RemoteIP = maskIP(comment.Info.RemoteIP)
			comment.IPAddress.IP = maskIP(comment.IPAddress.IP)
		} else {
			comment.IPAddress = ipAddressMap[comment.Info.RemoteIP]
		}
		return comment
	})
	// success
	return domain.NewPaginatedResult(comments, uint64(total)), nil
}

func (u *CommentUsecase) GetCommentListByKbID(ctx context.Context, req *domain.CommentListReq) (*domain.PaginatedResult[[]*domain.CommentListItem], error) {
	comments, total, err := u.CommentRepo.GetCommentListByKbID(ctx, req)
	if err != nil {
		return nil, err
	}

	// get ip address
	ipAddressMap := make(map[string]*domain.IPAddress)
	lo.Map(comments, func(comment *domain.CommentListItem, _ int) *domain.CommentListItem {
		if _, ok := ipAddressMap[comment.Info.RemoteIP]; !ok {
			ipAddress, err := u.ipRepo.GetIPAddress(ctx, comment.Info.RemoteIP)
			if err != nil {
				u.logger.Error("get ip address failed", log.Error(err), log.String("ip", comment.Info.RemoteIP))
				return comment
			}
			ipAddressMap[comment.Info.RemoteIP] = ipAddress
			comment.IPAddress = ipAddress
		} else {
			comment.IPAddress = ipAddressMap[comment.Info.RemoteIP]
		}
		return comment
	})

	return domain.NewPaginatedResult(comments, uint64(total)), nil
}

// 批量删除评论， （简单化，只删除传入评论id）
func (u *CommentUsecase) DeleteCommentList(ctx context.Context, req *domain.DeleteCommentListReq) error {
	err := u.CommentRepo.DeleteCommentList(ctx, req.IDS)
	if err != nil {
		return err
	}
	return nil
}

func maskIP(ip string) string {
	if ip == "" {
		return ""
	}
	// 处理 IPv4 地址 (格式: a.b.c.d)
	if strings.Contains(ip, ".") {
		parts := strings.Split(ip, ".")
		if len(parts) != 4 { // 非标准IPv4格式直接返回原值
			return ""
		}
		return parts[0] + ".*.*." + parts[3]
	}
	// 处理 IPv6 地址 (标准格式包含冒号)
	if strings.Contains(ip, ":") {
		return ""
	}

	return ""
}
