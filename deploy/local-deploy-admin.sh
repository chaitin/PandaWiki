#!/bin/bash

# 本地部署脚本 - 用于构建和传输 PandaWiki Admin 前端Docker镜像到服务器

set -e  # 遇到错误时退出

# 配置变量
IMAGE_NAME="panda-wiki-admin/frontend:main"
SERVER_IP="8.140.221.27"  # 请设置目标服务器IP
SERVER_USER="root"  # 请设置服务器用户名
SERVER_PATH="/tmp"  # 服务器上存储镜像的路径
SSH_KEY_PATH=""  # SSH密钥路径（可选）

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始本地部署流程...${NC}"

# 检查必要参数
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ]; then
    echo -e "${RED}错误: 请在脚本中设置 SERVER_IP 和 SERVER_USER 变量${NC}"
    exit 1
fi

# 1. 构建前端代码和Docker镜像
echo -e "${YELLOW}步骤1: 构建前端代码和Docker镜像...${NC}"
cd web/admin
# make image

# 2. 保存镜像为tar文件
echo -e "${YELLOW}步骤2: 将Docker镜像保存为tar文件...${NC}"
IMAGE_TAR="panda-wiki-admin_frontend.tar"
# 使用Makefile中的save目标来保存镜像
make save
# 移动到/tmp目录以便传输
mv /tmp/$IMAGE_TAR ./
echo -e "${GREEN}镜像已保存为 $IMAGE_TAR${NC}"

# 3. 传输到服务器
echo -e "${YELLOW}步骤3: 通过SCP传输镜像到服务器...${NC}"
if [ -z "$SSH_KEY_PATH" ]; then
    scp $IMAGE_TAR $SERVER_USER@$SERVER_IP:$SERVER_PATH/
else
    scp -i $SSH_KEY_PATH $IMAGE_TAR $SERVER_USER@$SERVER_IP:$SERVER_PATH/
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}镜像成功传输到服务器 $SERVER_IP:$SERVER_PATH/$IMAGE_TAR${NC}"
else
    echo -e "${RED}错误: 镜像传输失败${NC}"
    exit 1
fi

# 4. 清理本地临时文件
echo -e "${YELLOW}步骤4: 清理本地临时文件...${NC}"
rm $IMAGE_TAR
echo -e "${GREEN}本地临时文件已清理${NC}"

echo -e "${GREEN}本地部署完成! 接下来请在服务器上运行远程部署脚本。${NC}"
echo -e "${YELLOW}提示: 远程部署命令示例:${NC}"
echo "ssh $SERVER_USER@$SERVER_IP 'bash -s' < deploy/remote-deploy-admin.sh"