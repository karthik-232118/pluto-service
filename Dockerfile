FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./

# Install build tools + canvas dependencies
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies normally (do NOT force bcrypt build)
RUN npm install

COPY . .

EXPOSE 4321
CMD ["npm", "run", "start:prod"]
