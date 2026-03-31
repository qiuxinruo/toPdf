FROM hub.uban360.com/basic/puppeteer:21.5.0

USER root

# RUN groupadd -g 2049 admin
# RUN useradd -u 2049 -g admin -d /home/admin admin 
# RUN mkdir -p /home/admin
# RUN chown -R admin:admin /home/admin

# USER admin

# 设置工作目录
WORKDIR /app

# 将 package.json 和 package-lock.json 复制到容器中
COPY package*.json .

# 拷贝字体文件到容器中
COPY fonts/* /usr/share/fonts/

# 生成字体缓存，保证字体可用
RUN fc-cache -fv

# 安装项目依赖
RUN npm i --omit=dev --registry=https://registry.npmmirror.com

# 将项目文件复制到容器中
COPY . .

# 全局安装 PM2
RUN npm i pm2 -g --registry=https://registry.npmmirror.com

# 暴露服务端口
EXPOSE 3000

# 启动服务
CMD ["pm2-runtime", "index.js"]
