#!/bin/sh

yarn supabase db dump --linked -f schema.sql
yarn supabase db dump --linked -f data.sql --data-only
yarn supabase db dump --linked -f roles.sql --role-only
