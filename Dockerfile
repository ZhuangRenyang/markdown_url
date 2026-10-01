# 用于 Render / Koyeb / Fly.io 等支持 Docker 的平台
# 说明：只用普通 HTTP 请求抓网页，镜像里不装 Chromium，也不需要任何浏览器后端。
FROM node:20-slim

WORKDIR /app

# 依赖清单先单独拷贝，利用 Docker 缓存
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npm start -- -p ${PORT:-3000}"]
