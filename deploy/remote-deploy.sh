#!/bin/bash

# 远程部署脚本 - 用于在服务器上加载Docker镜像并更新容器

set -e  # 遇到错误时退出

# 配置变量
PROJECT_PATH="/root"  # PandaWiki项目在服务器上的路径，例如: /opt/pandawiki
IMAGE_TAR_PATH="/tmp/panda-wiki-api.tar"  # 镜像tar文件在服务器上的路径
SERVICE_NAME="api"  # docker-compose.yml中定义的服务名称
CONTAINER_NAME="panda-wiki-api"  # 容器名称

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始远程部署流程...${NC}"

# 检查必要参数
if [ -z "$PROJECT_PATH" ]; then
    echo -e "${RED}错误: 请设置 PROJECT_PATH 变量为PandaWiki项目在服务器上的路径${NC}"
    exit 1
fi

# 检查镜像tar文件是否存在
if [ ! -f "$IMAGE_TAR_PATH" ]; then
    echo -e "${RED}错误: 镜像文件 $IMAGE_TAR_PATH 不存在${NC}"
    exit 1
fi

# 1. 加载Docker镜像
echo -e "${YELLOW}步骤1: 加载Docker镜像...${NC}"
docker load -i $IMAGE_TAR_PATH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker镜像加载成功${NC}"
else
    echo -e "${RED}错误: Docker镜像加载失败${NC}"
    exit 1
fi

# 2. 进入项目目录
echo -e "${YELLOW}步骤2: 进入项目目录...${NC}"
cd $PROJECT_PATH

# 3. 停止指定的服务
echo -e "${YELLOW}步骤3: 停止 $SERVICE_NAME 服务...${NC}"
docker compose stop $SERVICE_NAME

# 4. 删除旧的容器
echo -e "${YELLOW}步骤4: 删除旧的容器...${NC}"
docker compose rm -f $SERVICE_NAME

# 5. 启动服务（会使用新加载的镜像）
echo -e "${YELLOW}步骤5: 启动 $SERVICE_NAME 服务...${NC}"
docker compose up -d $SERVICE_NAME
# 重启Caddy
docker compose restart caddy

# 6. 检查容器状态
echo -e "${YELLOW}步骤6: 检查容器状态...${NC}"
sleep 5  # 等待容器启动
CONTAINER_STATUS=$(docker ps -f name=$CONTAINER_NAME --format "{{.Status}}")

if [[ $CONTAINER_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}容器 $CONTAINER_NAME 已成功启动并运行${NC}"
else
    echo -e "${RED}警告: 容器 $CONTAINER_NAME 可能未正常运行，请检查日志${NC}"
    docker compose logs $SERVICE_NAME
fi

# 7. 清理镜像tar文件
echo -e "${YELLOW}步骤7: 清理镜像tar文件...${NC}"
rm $IMAGE_TAR_PATH
echo -e "${GREEN}镜像tar文件已清理${NC}"

echo -e "${GREEN}远程部署完成!${NC}"