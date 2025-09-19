FROM node:18-bullseye

# Install system packages
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Set up the node user
RUN groupadd --gid 1000 node \
    && usermod --uid 1000 --gid 1000 --shell /bin/bash node

# Set environment variables
ENV NODE_ENV=development

# Expose port
EXPOSE 3000

# Switch to node user
USER node

# Keep container running
CMD ["sleep", "infinity"]