FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Clean install dependencies (forces rebuild if package.json changes)
RUN npm install

COPY . .

CMD ["npm","run","start:prod"]
EXPOSE 4321