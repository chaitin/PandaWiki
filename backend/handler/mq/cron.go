package mq

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"

	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/usecase"
)

type CronHandler struct {
	logger      *log.Logger
	statRepo    *pg.StatRepository
	nodeRepo    *pg.NodeRepository
	statUseCase *usecase.StatUseCase
	nodeUseCase *usecase.NodeUsecase
	cron        *cron.Cron
}

func NewCronHandler(logger *log.Logger, statRepo *pg.StatRepository, nodeRepo *pg.NodeRepository, statUseCase *usecase.StatUseCase, nodeUseCase *usecase.NodeUsecase) (*CronHandler, error) {
	h := &CronHandler{
		statRepo:    statRepo,
		nodeRepo:    nodeRepo,
		statUseCase: statUseCase,
		nodeUseCase: nodeUseCase,
		logger:      logger.WithModule("handler.mq.cron"),
		cron:        cron.New(),
	}

	// 每小时 */10 分执行聚合统计数据任务
	if _, err := h.cron.AddFunc("*/10 */1 * * *", h.AggregateHourlyStats); err != nil {
		h.logger.Error("failed to add cron job for aggregating hourly stats", log.Error(err))
		return nil, err
	}
	h.logger.Info("add cron job", log.String("cron_id", "aggregate_hourly_stats"))

	// 每小时1分执行清理旧数据任务
	if _, err := h.cron.AddFunc("1 */1 * * *", h.RemoveOldStatData); err != nil {
		h.logger.Error("failed to add cron job for removing old data", log.Error(err))
		return nil, err
	}
	h.logger.Info("add cron job", log.String("cron_id", "remove_old_stat_data"))

	// 每天0点执行清理90天前的小时统计数据
	if _, err := h.cron.AddFunc("3 0 * * *", h.CleanupOldHourlyStats); err != nil {
		h.logger.Error("failed to add cron job for cleaning up old hourly stats", log.Error(err))
		return nil, err
	}
	h.logger.Info("add cron job", log.String("cron_id", "cleanup_old_hourly_stats"))

	// 启动时先异步跑一次
	go func() {
		if err := h.nodeUseCase.SyncRagNodeStatus(context.Background()); err != nil {
			h.logger.Error("initial sync rag node status failed", log.Error(err))
		}
	}()
	if _, err := h.cron.AddFunc("26 * * * *", h.SyncRagNodeStatus); err != nil {
		h.logger.Error("failed to sync rag node status", log.Error(err))
		return nil, err
	}
	h.logger.Info("add cron job", log.String("cron_id", "sync_rag_node_status"))

	// 每天2点执行清理30天前的node_release_backup数据
	if _, err := h.cron.AddFunc("0 2 * * *", h.CleanupOldNodeReleaseBackups); err != nil {
		h.logger.Error("failed to add cron job for cleaning up old node release backups", log.Error(err))
		return nil, err
	}
	h.logger.Info("add cron job", log.String("cron_id", "cleanup_old_node_release_backups"))

	h.cron.Start()
	h.logger.Info("start cron jobs")
	return h, nil
}

// Stop stops the scheduler and waits for the jobs that are already running to
// finish, so a shutdown does not leave a job half done.
func (h *CronHandler) Stop() {
	if h.cron == nil {
		return
	}
	<-h.cron.Stop().Done()
}

func (h *CronHandler) RemoveOldStatData() {
	h.logger.Info("remove old stat data start")

	// 零点时同步数据至node_stats持久化
	if time.Now().Hour() == 0 {
		if err := h.statUseCase.MigrateYesterdayPVToNodeStats(context.Background()); err != nil {
			h.logger.Error("migrate yesterday PV data to node_stats failed", log.Error(err))
		} else {
			h.logger.Info("migrate yesterday PV data to node_stats successful")
		}
	}

	err := h.statRepo.RemoveOldData(context.Background())
	if err != nil {
		h.logger.Error("remove old stat data failed", log.Error(err))
	}
	h.logger.Info("remove old stat data successful")
}

func (h *CronHandler) AggregateHourlyStats() {
	h.logger.Info("aggregate hourly stats start")
	err := h.statUseCase.AggregateHourlyStats(context.Background())
	if err != nil {
		h.logger.Error("aggregate hourly stats failed", log.Error(err))
		return
	}
	h.logger.Info("aggregate hourly stats successful")
}

func (h *CronHandler) CleanupOldHourlyStats() {
	h.logger.Info("cleanup old hourly stats start")
	err := h.statUseCase.CleanupOldHourlyStats(context.Background())
	if err != nil {
		h.logger.Error("cleanup old hourly stats failed", log.Error(err))
		return
	}
	h.logger.Info("cleanup old hourly stats successful")
}

func (h *CronHandler) SyncRagNodeStatus() {
	h.logger.Info("sync rag node status")
	err := h.nodeUseCase.SyncRagNodeStatus(context.Background())
	if err != nil {
		h.logger.Error("sync rag node status failed", log.Error(err))
		return
	}
	h.logger.Info("sync rag node status successful")
}

func (h *CronHandler) CleanupOldNodeReleaseBackups() {
	h.logger.Info("cleanup old node release backups start")
	before := time.Now().AddDate(0, 0, -30)
	if err := h.nodeRepo.DeleteOldNodeReleaseBackups(context.Background(), before); err != nil {
		h.logger.Error("cleanup old node release backups failed", log.Error(err))
		return
	}
	h.logger.Info("cleanup old node release backups successful")
}
