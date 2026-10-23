package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/viper"
)

type Config struct {
	Log           LogConfig       `mapstructure:"log"`
	HTTP          HTTPConfig      `mapstructure:"http"`
	Health        HealthConfig    `mapstructure:"health"`
	AdminPassword string          `mapstructure:"admin_password"`
	PG            PGConfig        `mapstructure:"pg"`
	MQ            MQConfig        `mapstructure:"mq"`
	RAG           RAGConfig       `mapstructure:"rag"`
	Redis         RedisConfig     `mapstructure:"redis"`
	Auth          AuthConfig      `mapstructure:"auth"`
	S3            S3Config        `mapstructure:"s3"`
	Sentry        SentryConfig    `mapstructure:"sentry"`
	Telemetry     TelemetryConfig `mapstructure:"telemetry"`
	Setup         SetupConfig     `mapstructure:"setup"`
	Caddy         CaddyConfig     `mapstructure:"caddy"`
	CaddyAPI      string          `mapstructure:"caddy_api"`
	SubnetPrefix  string          `mapstructure:"subnet_prefix"`
}

type LogConfig struct {
	Level int `mapstructure:"level"`
}

type HTTPConfig struct {
	Port int `mapstructure:"port"`
}

// HealthConfig configures the dedicated liveness/readiness endpoint. It is
// disabled by default (Port 0) so existing deployments are unaffected.
type HealthConfig struct {
	Port int `mapstructure:"port"`
}

type PGConfig struct {
	DSN string `mapstructure:"dsn"`
	// AutoMigrate runs the SQL migrations on every startup. Disable it when
	// migrations are executed by a separate job.
	AutoMigrate bool `mapstructure:"auto_migrate"`
	// CreateRagliteDB creates the raglite database when it is missing.
	CreateRagliteDB bool `mapstructure:"create_raglite_db"`
}

type TelemetryConfig struct {
	Enabled bool `mapstructure:"enabled"`
}

type SetupConfig struct {
	// InitCert makes the api generate a self-signed certificate on startup for
	// the bundled admin nginx to consume through a shared volume. Set to false
	// when the certificate is provided by other means, or when the root
	// filesystem is read-only.
	InitCert bool `mapstructure:"init_cert"`
}

type CaddyConfig struct {
	// Upstreams are the reverse_proxy dial targets (host:port, without scheme).
	// Empty values fall back to addresses derived from SubnetPrefix.
	Upstreams CaddyUpstreams `mapstructure:"upstreams"`
	// AdminListen is merged into the top-level "admin" key of the config pushed
	// to Caddy. Leave empty to keep Caddy's own admin listener untouched.
	AdminListen string `mapstructure:"admin_listen"`
}

type CaddyUpstreams struct {
	API        string `mapstructure:"api"`
	App        string `mapstructure:"app"`
	StaticFile string `mapstructure:"static_file"`
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

type RAGConfig struct {
	Provider string      `mapstructure:"provider"`
	CTRAG    CTRAGConfig `mapstructure:"ct_rag"`
}

type CTRAGConfig struct {
	BaseURL string `mapstructure:"base_url"`
	APIKey  string `mapstructure:"api_key"`
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
	Endpoint  string `mapstructure:"endpoint"`
	AccessKey string `mapstructure:"access_key"`
	SecretKey string `mapstructure:"secret_key"`
}

type SentryConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	DSN     string `mapstructure:"dsn"`
}

func NewConfig() (*Config, error) {
	// set default config
	SUBNET_PREFIX := os.Getenv("SUBNET_PREFIX")
	if SUBNET_PREFIX == "" {
		SUBNET_PREFIX = "169.254.15"
	}
	defaultConfig := &Config{
		Log: LogConfig{
			Level: 0,
		},
		AdminPassword: "",
		HTTP: HTTPConfig{
			Port: 8000,
		},
		Health: HealthConfig{
			// disabled by default; existing deployments keep their behaviour
			Port: 0,
		},
		PG: PGConfig{
			DSN:             "host=panda-wiki-postgres user=panda-wiki password=panda-wiki-secret dbname=panda-wiki port=5432 sslmode=disable TimeZone=Asia/Shanghai",
			AutoMigrate:     true,
			CreateRagliteDB: true,
		},
		MQ: MQConfig{
			Type: "nats",
			NATS: NATSConfig{
				Server:   fmt.Sprintf("nats://%s.13:4222", SUBNET_PREFIX),
				User:     "panda-wiki",
				Password: "",
			},
		},
		RAG: RAGConfig{
			Provider: "ct",
			CTRAG: CTRAGConfig{
				BaseURL: fmt.Sprintf("http://%s.18:5050", SUBNET_PREFIX),
				APIKey:  "sk-1234567890",
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
			Endpoint:  "panda-wiki-minio:9000",
			AccessKey: "s3panda-wiki",
			SecretKey: "",
		},
		Sentry: SentryConfig{
			Enabled: true,
			DSN:     "https://2a4cff1ae04b624ffc72663f523024ff@sentry.baizhi.cloud/4",
		},
		Telemetry: TelemetryConfig{
			Enabled: true,
		},
		Setup: SetupConfig{
			InitCert: true,
		},
		CaddyAPI:     "/app/run/caddy-admin.sock",
		SubnetPrefix: "169.254.15",
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
	if env := os.Getenv("SUBNET_PREFIX"); env != "" {
		c.SubnetPrefix = env
	}
	// pg
	if env := os.Getenv("PG_DSN"); env != "" {
		c.PG.DSN = env
	}
	if env := os.Getenv("PG_AUTO_MIGRATE"); env != "" {
		c.PG.AutoMigrate = env == "true"
	}
	if env := os.Getenv("PG_CREATE_RAGLITE_DB"); env != "" {
		c.PG.CreateRagliteDB = env == "true"
	}
	// nats
	if env := os.Getenv("MQ_NATS_SERVER"); env != "" {
		c.MQ.NATS.Server = env
	}
	// rag
	if env := os.Getenv("RAG_CT_RAG_BASE_URL"); env != "" {
		c.RAG.CTRAG.BaseURL = env
	}
	// redis
	if env := os.Getenv("REDIS_ADDR"); env != "" {
		c.Redis.Addr = env
	}
	// s3
	if env := os.Getenv("S3_ENDPOINT"); env != "" {
		c.S3.Endpoint = env
	}
	// sentry
	if env := os.Getenv("SENTRY_ENABLED"); env != "" {
		c.Sentry.Enabled = env == "true"
	}
	if env := os.Getenv("SENTRY_DSN"); env != "" {
		c.Sentry.DSN = env
	}
	// telemetry
	if env := os.Getenv("TELEMETRY_ENABLED"); env != "" {
		c.Telemetry.Enabled = env == "true"
	}
	// setup
	if env := os.Getenv("INIT_CERT"); env != "" {
		c.Setup.InitCert = env == "true"
	}
	// http
	if env := os.Getenv("HTTP_PORT"); env != "" {
		if i, err := strconv.Atoi(env); err == nil {
			c.HTTP.Port = i
		} else {
			fmt.Fprintf(os.Stderr, "Invalid http port: %s with err: %s\n", env, err)
		}
	}
	if env := os.Getenv("HEALTH_PORT"); env != "" {
		if i, err := strconv.Atoi(env); err == nil {
			c.Health.Port = i
		} else {
			fmt.Fprintf(os.Stderr, "Invalid health port: %s with err: %s\n", env, err)
		}
	}
	// caddy api
	if env := os.Getenv("CADDY_API"); env != "" {
		c.CaddyAPI = env
	}
	if env := os.Getenv("CADDY_ADMIN_LISTEN"); env != "" {
		c.Caddy.AdminListen = env
	}
	if env := os.Getenv("CADDY_UPSTREAM_API"); env != "" {
		c.Caddy.Upstreams.API = env
	}
	if env := os.Getenv("CADDY_UPSTREAM_APP"); env != "" {
		c.Caddy.Upstreams.App = env
	}
	if env := os.Getenv("CADDY_UPSTREAM_STATIC"); env != "" {
		c.Caddy.Upstreams.StaticFile = env
	}
	// log level
	if env := os.Getenv("LOG_LEVEL"); env != "" {
		if i, err := strconv.Atoi(env); err == nil {
			// -4: debug
			// 0: info
			// 4: warn
			// 8: error
			c.Log.Level = i
		} else {
			fmt.Fprintf(os.Stderr, "Invalid log level: %s with err: %s\n", env, err)
		}
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
