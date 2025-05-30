package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Log           LogConfig       `mapstructure:"log"`
	HTTP          HTTPConfig      `mapstructure:"http"`
	AdminPassword string          `mapstructure:"admin_password"`
	PG            PGConfig        `mapstructure:"pg"`
	MQ            MQConfig        `mapstructure:"mq"`
	Embedding     EmbeddingConfig `mapstructure:"embedding"`
	Vector        VectorConfig    `mapstructure:"vector"`
	Redis         RedisConfig     `mapstructure:"redis"`
	Auth          AuthConfig      `mapstructure:"auth"`
	S3            S3Config        `mapstructure:"s3"`
	AppBaseURL    string          `mapstructure:"APP_BASE_URL"`
}

type LogConfig struct {
	Level int `mapstructure:"level"`
}

type HTTPConfig struct {
	Port int `mapstructure:"port"`
}

type PGConfig struct {
	DSN string `mapstructure:"dsn"`
}

type MQConfig struct {
	Type string     `mapstructure:"type"`
	NATS NATSConfig `mapstructure:"nats"`
}

type NATSConfig struct {
	Server   string `mapstructure:"server"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
}

type EmbeddingConfig struct {
	Provider             string    `mapstructure:"provider"`
	RerankTopK           int       `mapstructure:"rerank_top_k"`
	RerankScoreThreshold float64   `mapstructure:"rerank_score_threshold"`
	BGE                  BGEConfig `mapstructure:"bge"`
}

type BGEConfig struct {
	Host           string `mapstructure:"host"`
	Token          string `mapstructure:"token"`
	EmbeddingModel string `mapstructure:"embedding_model"`
	RerankModel    string `mapstructure:"rerank_model"`
}

type VectorConfig struct {
	Provider  string       `mapstructure:"provider"`
	QueryTopK int          `mapstructure:"query_top_k"`
	Qdrant    QdrantConfig `mapstructure:"qdrant"`
}

type QdrantConfig struct {
	Host       string `mapstructure:"host"`
	Port       int    `mapstructure:"port"`
	APIKey     string `mapstructure:"api_key"`
	Collection string `mapstructure:"collection"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
}

type AuthConfig struct {
	Type string    `mapstructure:"type"`
	JWT  JWTConfig `mapstructure:"jwt"`
}

type JWTConfig struct {
	Secret string `mapstructure:"secret"`
}

type S3Config struct {
	Endpoint    string `mapstructure:"endpoint"`
	AccessKey   string `mapstructure:"access_key"`
	SecretKey   string `mapstructure:"secret_key"`
	MaxFileSize int64  `mapstructure:"max_file_size"`
}

func NewConfig() (*Config, error) {
	// set default config
	defaultConfig := &Config{
		Log: LogConfig{
			Level: 0,
		},
		AdminPassword: "",
		HTTP: HTTPConfig{
			Port: 8000,
		},
		PG: PGConfig{
			DSN: "host=panda-wiki-postgres user=panda-wiki password=panda-wiki-secret dbname=panda-wiki port=5432 sslmode=disable TimeZone=Asia/Shanghai",
		},
		MQ: MQConfig{
			Type: "nats",
			NATS: NATSConfig{
				Server:   "nats://panda-wiki-nats:4222",
				User:     "panda-wiki",
				Password: "",
			},
		},
		Embedding: EmbeddingConfig{
			Provider:             "bge",
			RerankTopK:           5,
			RerankScoreThreshold: 0.1,
			BGE: BGEConfig{
				Host:           "https://api.siliconflow.com",
				Token:          "",
				EmbeddingModel: "bge-m3",
				RerankModel:    "bge-reranker-v2-m3",
			},
		},
		Vector: VectorConfig{
			Provider:  "qdrant",
			QueryTopK: 10,
			Qdrant: QdrantConfig{
				Host:       "panda-wiki-vector-db",
				Port:       6334,
				APIKey:     "",
				Collection: "panda-wiki",
			},
		},
		Redis: RedisConfig{
			Addr:     "panda-wiki-redis:6379",
			Password: "",
		},
		Auth: AuthConfig{
			Type: "jwt",
			JWT:  JWTConfig{Secret: ""},
		},
		S3: S3Config{
			Endpoint:    "panda-wiki-minio:9000",
			AccessKey:   "s3panda-wiki",
			SecretKey:   "",
			MaxFileSize: 5242880, // 5MB
		},
		AppBaseURL: "http://localhost:3000",
	}

	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.SetConfigName("config")
	viper.SetConfigType("yml")

	// try to read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// if config file not found, return default config
			return nil, err
		}
	}

	// merge config file values to default config
	if err := viper.Unmarshal(defaultConfig); err != nil {
		return nil, err
	}

	// finally, override sensitive info with env variables
	overrideWithEnv(defaultConfig)

	return defaultConfig, nil
}

// overrideWithEnv override sensitive info with env variables
func overrideWithEnv(c *Config) {
	if env := os.Getenv("POSTGRES_PASSWORD"); env != "" {
		c.PG.DSN = fmt.Sprintf("host=panda-wiki-postgres user=panda-wiki password=%s dbname=panda-wiki port=5432 sslmode=disable TimeZone=Asia/Shanghai", env)
	}
	if env := os.Getenv("NATS_PASSWORD"); env != "" {
		c.MQ.NATS.Password = env
	}
	if env := os.Getenv("QDRANT_API_KEY"); env != "" {
		c.Vector.Qdrant.APIKey = env
	}
	if env := os.Getenv("REDIS_PASSWORD"); env != "" {
		c.Redis.Password = env
	}
	if env := os.Getenv("JWT_SECRET"); env != "" {
		c.Auth.JWT.Secret = env
	}
	if env := os.Getenv("S3_SECRET_KEY"); env != "" {
		c.S3.SecretKey = env
	}
	if env := os.Getenv("ADMIN_PASSWORD"); env != "" {
		c.AdminPassword = env
	}
	if env := os.Getenv("APP_BASE_URL"); env != "" {
		c.AppBaseURL = env
	}
}

func (*Config) GetString(key string) string {
	return viper.GetString(key)
}

func (*Config) GetInt(key string) int {
	return viper.GetInt(key)
}

func (*Config) GetUint64(key string) uint64 {
	return viper.GetUint64(key)
}

func (*Config) GetBool(key string) bool {
	return viper.GetBool(key)
}

func (*Config) GetStringSlice(key string) []string {
	return viper.GetStringSlice(key)
}

func (*Config) GetFloat64(key string) float64 {
	return viper.GetFloat64(key)
}
