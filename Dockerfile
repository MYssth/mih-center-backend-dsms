FROM node:18.12.1
ENV NODE_ENV=production
# ENV NODE_ENV=development

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

HEALTHCHECK --interval=1m --retries=2 \
CMD curl -f http://localhost:6006/api/dsms/health || exit 1

CMD [ "node", "server.js" ]