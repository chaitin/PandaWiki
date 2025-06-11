package usecase

import (
	"context"
	"errors"
	"reflect"
	"testing"
	// "time" // No longer directly used in this file after refactoring CreateApp test

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
)

// Ensure MockAppRepository implements pg.AppRepositoryInterface
var _ pg.AppRepositoryInterface = (*MockAppRepository)(nil)

// MockAppRepository is a mock implementation of pg.AppRepositoryInterface
type MockAppRepository struct {
	CreateAppFunc                func(ctx context.Context, app *domain.App) error
	UpdateAppFunc                func(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error
	DeleteAppFunc                func(ctx context.Context, id string) error
	GetAppDetailByKBIDAndTypeFunc func(ctx context.Context, kbID string, appType domain.AppType) (*domain.App, error)
	GetAppDetailFunc             func(ctx context.Context, id string) (*domain.App, error)

	CreateAppCalledWithApp                 *domain.App
	UpdateAppCalledWithID                  string
	UpdateAppCalledWithReq                 *domain.UpdateAppReq
	DeleteAppCalledWithID                  string
	GetAppDetailByKBIDAndTypeCalledWithKBID  string
	GetAppDetailByKBIDAndTypeCalledWithType domain.AppType
	GetAppDetailCalledWithID               string
}

func (m *MockAppRepository) CreateApp(ctx context.Context, app *domain.App) error {
	m.CreateAppCalledWithApp = app
	if m.CreateAppFunc != nil {
		return m.CreateAppFunc(ctx, app)
	}
	return nil
}

func (m *MockAppRepository) UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error {
	m.UpdateAppCalledWithID = id
	m.UpdateAppCalledWithReq = appRequest
	if m.UpdateAppFunc != nil {
		return m.UpdateAppFunc(ctx, id, appRequest)
	}
	return nil
}

func (m *MockAppRepository) DeleteApp(ctx context.Context, id string) error {
	m.DeleteAppCalledWithID = id
	if m.DeleteAppFunc != nil {
		return m.DeleteAppFunc(ctx, id)
	}
	return nil
}

func (m *MockAppRepository) GetAppDetailByKBIDAndType(ctx context.Context, kbID string, appType domain.AppType) (*domain.App, error) {
	m.GetAppDetailByKBIDAndTypeCalledWithKBID = kbID
	m.GetAppDetailByKBIDAndTypeCalledWithType = appType
	if m.GetAppDetailByKBIDAndTypeFunc != nil {
		return m.GetAppDetailByKBIDAndTypeFunc(ctx, kbID, appType)
	}
	return &domain.App{}, nil // Default to returning an empty app to avoid nil pointer dereferences in tests
}

func (m *MockAppRepository) GetAppDetail(ctx context.Context, id string) (*domain.App, error) {
	m.GetAppDetailCalledWithID = id
	if m.GetAppDetailFunc != nil {
		return m.GetAppDetailFunc(ctx, id)
	}
	return &domain.App{}, nil // Default
}

// Ensure MockNodeUsecase implements usecase.NodeUsecaseInterface
var _ NodeUsecaseInterface = (*MockNodeUsecase)(nil)

// MockNodeUsecase is a mock implementation of NodeUsecaseInterface
type MockNodeUsecase struct {
	GetRecommendNodeListFunc      func(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error)
	GetRecommendNodeListCalled    bool
	GetRecommendNodeListCalledWithReq *domain.GetRecommendNodeListReq
}

func (m *MockNodeUsecase) GetRecommendNodeList(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error) {
	m.GetRecommendNodeListCalled = true
	m.GetRecommendNodeListCalledWithReq = req
	if m.GetRecommendNodeListFunc != nil {
		return m.GetRecommendNodeListFunc(ctx, req)
	}
	return nil, nil
}

func newTestAppUsecase(mockRepo pg.AppRepositoryInterface, mockNodeUC NodeUsecaseInterface) *AppUsecase {
	if mockRepo == nil {
		mockRepo = &MockAppRepository{}
	}
	if mockNodeUC == nil {
		mockNodeUC = &MockNodeUsecase{}
	}
	logCfg := config.LogConfig{Level: 100} // Effectively silences logs
	dummyOverallConfig := &config.Config{Log: logCfg}
	dummyLogger := log.NewLogger(dummyOverallConfig)
	appUsecaseConfig := &config.Config{}
	// Pass nil for conversationRepo as it's not used by the methods under test here.
	return NewAppUsecase(mockRepo, mockNodeUC, nil, dummyLogger, appUsecaseConfig)
}

// --- Tests ---

func TestAppUsecase_CreateApp(t *testing.T) {
	t.Run("Successful app creation", func(t *testing.T) {
		mockRepo := &MockAppRepository{}
		appUsecase := newTestAppUsecase(mockRepo, nil)

		appToCreate := &domain.App{
			ID:   "test-app-id",
			KBID: "test-kb-id",
			Name: "Test App",
			Type: domain.AppTypeWeb,
		}
		ctx := context.Background()
		err := appUsecase.CreateApp(ctx, appToCreate)

		if err != nil {
			t.Errorf("Expected no error, but got %v", err)
		}
		if mockRepo.CreateAppCalledWithApp == nil {
			t.Fatalf("Expected AppRepository.CreateApp to be called, but it wasn't")
		}
		if !reflect.DeepEqual(mockRepo.CreateAppCalledWithApp, appToCreate) {
			t.Errorf("Expected AppRepository.CreateApp to be called with %+v, but got %+v", appToCreate, mockRepo.CreateAppCalledWithApp)
		}
	})
}

func TestAppUsecase_UpdateApp(t *testing.T) {
	t.Run("Successful app update", func(t *testing.T) {
		mockRepo := &MockAppRepository{}
		appUsecase := newTestAppUsecase(mockRepo, nil)

		appID := "test-app-id"
		updateReq := &domain.UpdateAppReq{Name: Ptr("New Name")}
		ctx := context.Background()
		err := appUsecase.UpdateApp(ctx, appID, updateReq)

		if err != nil {
			t.Errorf("Expected no error, but got %v", err)
		}
		if mockRepo.UpdateAppCalledWithID != appID {
			t.Errorf("Expected UpdateApp to be called with ID %s, got %s", appID, mockRepo.UpdateAppCalledWithID)
		}
		if !reflect.DeepEqual(mockRepo.UpdateAppCalledWithReq, updateReq) {
			t.Errorf("Expected UpdateApp to be called with req %+v, got %+v", updateReq, mockRepo.UpdateAppCalledWithReq)
		}
	})
}

func TestAppUsecase_DeleteApp(t *testing.T) {
	t.Run("Successful app deletion", func(t *testing.T) {
		mockRepo := &MockAppRepository{}
		appUsecase := newTestAppUsecase(mockRepo, nil)

		appID := "test-app-id"
		ctx := context.Background()
		err := appUsecase.DeleteApp(ctx, appID)

		if err != nil {
			t.Errorf("Expected no error, but got %v", err)
		}
		if mockRepo.DeleteAppCalledWithID != appID {
			t.Errorf("Expected DeleteApp to be called with ID %s, got %s", appID, mockRepo.DeleteAppCalledWithID)
		}
	})
}

func TestAppUsecase_GetAppDetailByKBIDAndAppType(t *testing.T) {
	kbID := "test-kb-id"
	appType := domain.AppTypeWeb
	expectedApp := &domain.App{
		ID:   "app-123",
		KBID: kbID,
		Type: appType,
		Name: "Test App",
		Settings: domain.AppSettings{
			Title:            "Welcome",
			RecommendNodeIDs: []string{"node1", "node2"},
		},
	}
	expectedNodes := []*domain.RecommendNodeListResp{{ID: "node1"}, {ID: "node2"}}

	t.Run("Successful retrieval with recommend nodes", func(t *testing.T) {
		mockRepo := &MockAppRepository{
			GetAppDetailByKBIDAndTypeFunc: func(ctx context.Context, id string, at domain.AppType) (*domain.App, error) {
				if id == kbID && at == appType {
					return expectedApp, nil
				}
				return nil, errors.New("app not found")
			},
		}
		mockNodeUC := &MockNodeUsecase{
			GetRecommendNodeListFunc: func(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error) {
				if req.KBID == kbID && reflect.DeepEqual(req.NodeIDs, expectedApp.Settings.RecommendNodeIDs) {
					return expectedNodes, nil
				}
				return nil, errors.New("nodes not found")
			},
		}
		appUsecase := newTestAppUsecase(mockRepo, mockNodeUC)
		ctx := context.Background()
		result, err := appUsecase.GetAppDetailByKBIDAndAppType(ctx, kbID, appType)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if mockRepo.GetAppDetailByKBIDAndTypeCalledWithKBID != kbID || mockRepo.GetAppDetailByKBIDAndTypeCalledWithType != appType {
			t.Errorf("GetAppDetailByKBIDAndType not called with expected args")
		}
		if !mockNodeUC.GetRecommendNodeListCalled {
			t.Errorf("Expected GetRecommendNodeList to be called")
		}
		if !reflect.DeepEqual(mockNodeUC.GetRecommendNodeListCalledWithReq.NodeIDs, expectedApp.Settings.RecommendNodeIDs) {
			t.Errorf("GetRecommendNodeList called with wrong NodeIDs: got %v, want %v", mockNodeUC.GetRecommendNodeListCalledWithReq.NodeIDs, expectedApp.Settings.RecommendNodeIDs)
		}
		if result.Name != expectedApp.Name {
			t.Errorf("Expected app name %s, got %s", expectedApp.Name, result.Name)
		}
		if !reflect.DeepEqual(result.RecommendNodes, expectedNodes) {
			t.Errorf("Expected recommend nodes %+v, got %+v", expectedNodes, result.RecommendNodes)
		}
	})

	t.Run("Successful retrieval without recommend nodes", func(t *testing.T) {
		appWithoutRecNodes := &domain.App{
			ID:   "app-456",
			KBID: kbID,
			Type: appType,
			Name: "Test App No Rec",
			Settings: domain.AppSettings{
				Title: "Welcome",
			},
		}
		mockRepo := &MockAppRepository{
			GetAppDetailByKBIDAndTypeFunc: func(ctx context.Context, id string, at domain.AppType) (*domain.App, error) {
				return appWithoutRecNodes, nil
			},
		}
		mockNodeUC := &MockNodeUsecase{} // Reset called status for this sub-test
		appUsecase := newTestAppUsecase(mockRepo, mockNodeUC)
		ctx := context.Background()
		result, err := appUsecase.GetAppDetailByKBIDAndAppType(ctx, kbID, appType)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if mockNodeUC.GetRecommendNodeListCalled {
			t.Errorf("Expected GetRecommendNodeList NOT to be called")
		}
		if result.Name != appWithoutRecNodes.Name {
			t.Errorf("Expected app name %s, got %s", appWithoutRecNodes.Name, result.Name)
		}
	})
}

func TestAppUsecase_GetWebAppInfo(t *testing.T) {
	kbID := "test-kb-id-webapp"
	expectedApp := &domain.App{
		ID:   "app-web-123",
		KBID: kbID,
		Type: domain.AppTypeWeb, // Specific to this function
		Name: "Test Web App",
		Settings: domain.AppSettings{
			Title:            "Web Portal",
			RecommendNodeIDs: []string{"node-web-1", "node-web-2"},
		},
	}
	expectedNodes := []*domain.RecommendNodeListResp{{ID: "node-web-1"}, {ID: "node-web-2"}}

	t.Run("Successful retrieval with recommend nodes for web app", func(t *testing.T) {
		mockRepo := &MockAppRepository{
			GetAppDetailByKBIDAndTypeFunc: func(ctx context.Context, id string, at domain.AppType) (*domain.App, error) {
				if id == kbID && at == domain.AppTypeWeb {
					return expectedApp, nil
				}
				return nil, errors.New("app not found")
			},
		}
		mockNodeUC := &MockNodeUsecase{
			GetRecommendNodeListFunc: func(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error) {
				if req.KBID == kbID && reflect.DeepEqual(req.NodeIDs, expectedApp.Settings.RecommendNodeIDs) {
					return expectedNodes, nil
				}
				return nil, errors.New("nodes not found")
			},
		}
		appUsecase := newTestAppUsecase(mockRepo, mockNodeUC)
		ctx := context.Background()
		result, err := appUsecase.GetWebAppInfo(ctx, kbID)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if mockRepo.GetAppDetailByKBIDAndTypeCalledWithKBID != kbID || mockRepo.GetAppDetailByKBIDAndTypeCalledWithType != domain.AppTypeWeb {
			t.Errorf("GetAppDetailByKBIDAndType not called with expected args for web app")
		}
		if !mockNodeUC.GetRecommendNodeListCalled {
			t.Errorf("Expected GetRecommendNodeList to be called for web app")
		}
		if !reflect.DeepEqual(mockNodeUC.GetRecommendNodeListCalledWithReq.NodeIDs, expectedApp.Settings.RecommendNodeIDs) {
			t.Errorf("GetRecommendNodeList called with wrong NodeIDs for web app: got %v, want %v", mockNodeUC.GetRecommendNodeListCalledWithReq.NodeIDs, expectedApp.Settings.RecommendNodeIDs)
		}
		if result.Name != expectedApp.Name {
			t.Errorf("Expected app name %s, got %s", expectedApp.Name, result.Name)
		}
		if !reflect.DeepEqual(result.RecommendNodes, expectedNodes) {
			t.Errorf("Expected recommend nodes %+v, got %+v for web app", expectedNodes, result.RecommendNodes)
		}
	})

	t.Run("Successful retrieval without recommend nodes for web app", func(t *testing.T) {
		appWithoutRecNodes := &domain.App{
			ID:   "app-web-456",
			KBID: kbID,
			Type: domain.AppTypeWeb,
			Name: "Test Web App No Rec",
			Settings: domain.AppSettings{
				Title: "Web Portal No Rec",
			},
		}
		mockRepo := &MockAppRepository{
			GetAppDetailByKBIDAndTypeFunc: func(ctx context.Context, id string, at domain.AppType) (*domain.App, error) {
				return appWithoutRecNodes, nil
			},
		}
		mockNodeUC := &MockNodeUsecase{}
		appUsecase := newTestAppUsecase(mockRepo, mockNodeUC)
		ctx := context.Background()
		result, err := appUsecase.GetWebAppInfo(ctx, kbID)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}
		if mockNodeUC.GetRecommendNodeListCalled {
			t.Errorf("Expected GetRecommendNodeList NOT to be called for web app without rec nodes")
		}
		if result.Name != appWithoutRecNodes.Name {
			t.Errorf("Expected app name %s, got %s", appWithoutRecNodes.Name, result.Name)
		}
	})
}

// Helper function to get a pointer to a string
func Ptr(s string) *string {
	return &s
}

// TestApp can be kept or removed if it's just a placeholder now.
// func TestApp(t *testing.T) {
// 	if true != true {
// 		t.Errorf("Something is terribly wrong with the basic test setup")
// 	}
// }
