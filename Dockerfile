# 用于 Render / Koyeb / Fly.io 等支持 Docker 的平台
# 说明：网页抓取默认走 Cloudflare Worker（HTMLFETCH_API），所以镜像里不装 Chromium。
#      如果你想让容器自己跑浏览器，把下面 CHROMIUM 那几行的注释去掉。
FROM node:20-slim

WORKDIR /app

# 依赖清单先单独拷贝，利用 Docker 缓存
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

# 若要在容器内跑 Puppeteer，取消下面注释（约 +350MB，建议实例内存 ≥1GB）
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     chromium ca-certificates fonts-liberation \
#  && rm -rf /var/lib/apt/lists/*
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
