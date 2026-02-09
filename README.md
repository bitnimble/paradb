## Installation

```
# Clone and install deps
git clone https://github.com/bitnimble/paradb.git
cd paradb
bun install

# Start local Supabase (requires Supabase CLI)
bun supabase start

# Copy the example env file and fill in any missing values
cp .env.test .env.localdev

# Start the dev server
bun dev:local
```

## Running tests

```
# Ensure local Supabase is running
bun supabase start

# Run tests
bun test
```
