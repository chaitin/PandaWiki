## 启动部署 -  backend api 服务

./backend中的服务端代码发布，对应的docker image是 panda-wiki-api

 - 1. 本地打包构建，并传输到服务器，默认 root@8.140.221.27
```
./deploy/local-deploy.sh
```
>> 也默认会重新构建panda-wiki-consumer image

 - 2. 服务重启

 ```
 ./deploy/remote-deploy.sh
 ```