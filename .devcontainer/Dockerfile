FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

# 1. Install pipx system-wide
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends pipx \
    && pipx ensurepath

# 2. Switch to the 'node' user FIRST, then install scfw
USER node
RUN pipx install scfw \
    && /home/node/.local/bin/scfw configure --yes

# 3. Switch back to root if you have other system-level tasks 
# (or just leave it as node for safety)
USER root

# Fix the ENV warning mentioned in your logs while we're at it
ENV SHELL=/bin/zsh