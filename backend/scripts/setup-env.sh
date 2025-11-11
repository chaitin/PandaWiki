#!/bin/bash

# 设置环境变量以确保正确使用工具
export PATH=$PATH:$(go env GOPATH)/bin

# 检查并安装必要的工具
echo "检查必要的工具..."

# 检查 swag 是否已安装
if ! command -v swag &> /dev/null
then
    echo "安装 swag..."
    GOPROXY=https://goproxy.cn,direct go install github.com/swaggo/swag/cmd/swag@v1.16.5
fi

# 检查 wire 是否已安装
if ! command -v wire &> /dev/null
then
    echo "安装 wire..."
    GOPROXY=https://goproxy.cn,direct go install github.com/google/wire/cmd/wire@latest
fi

echo "环境设置完成。"