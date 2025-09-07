FROM node:20-alpine

ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs dist/standalone ./
COPY --chown=nextjs:nodejs dist/static ./dist/static
USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"
CMD ["node", "./app/server.js"]