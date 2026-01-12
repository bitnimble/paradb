#!/bin/sh

bun supabase db dump --linked -f schema.sql
bun supabase db dump --linked -f data.sql --data-only
bun supabase db dump --linked -f roles.sql --role-only
