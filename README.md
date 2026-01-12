## Installation

```
# Clone and install deps
git clone https://github.com/bitnimble/paradb.git
cd paradb
bun install

# Install and start postgres
sudo apt install postgresql
sudo service postgresql start

# Create postgres user for yourself
sudo -u postgres createuser --interactive --pwprompt

# Edit .env to fill out your username and password!

# Create db and instantiate schema
createdb paradb
db/init.sh

# Start server
bun dev
```
