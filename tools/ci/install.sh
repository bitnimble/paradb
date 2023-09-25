#!/bin/bash

if [ -f "/.paradb-deps" ]; then
  echo "Dependencies already installed"
  exit
fi

echo "deb [trusted=yes] https://apt.fury.io/meilisearch/ /" | tee /etc/apt/sources.list.d/fury.list

apt update
DEBIAN_FRONTEND=noninteractive apt install wget xz-utils postgresql meilisearch unzip sudo -y

pushd /tmp || exit

echo "Setting up node"
NODE_18=node-v18.18.0-linux-x64
wget "https://nodejs.org/dist/v18.18.0/$NODE_18.tar.xz"
tar xf "$NODE_18.tar.xz"
ln -s "$(pwd)/$NODE_18/bin/node" /usr/local/bin/node
ln -s "$(pwd)/$NODE_18/bin/npm" /usr/local/bin/npm

echo "Installing yarn"
mkdir /etc/.npm-global
npm config set prefix /etc/.npm-global
npm install -g yarn

curl -fsSL https://bun.sh/install | bash
# shellcheck source=/dev/null
source "$HOME/.bashrc"

echo "Setting up minio"
wget -P /usr/local/bin/ https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x /usr/local/bin/mc
wget https://dl.min.io/server/minio/release/linux-amd64/archive/minio_20230920224955.0.0_amd64.deb -O minio.deb
dpkg -i minio.deb

nohup /usr/local/bin/minio server /data 2>&1 >/dev/null &

echo "Setting up postgres"
service postgresql start
sudo -u postgres -E psql -c "CREATE ROLE paradb_test LOGIN SUPERUSER PASSWORD '1234';"

echo "Setting up meilisearch"
nohup meilisearch --no-analytics --master-key="123" 2>&1 >/dev/null &

popd || exit

touch /.paradb-deps

echo "Installed dependencies"
