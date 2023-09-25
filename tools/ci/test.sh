#!/bin/bash

yarn start &
yarn test

pkill -f "sh -c next start"
pkill -f ".bin/next start"
pkill -f "next-router-worker"
pkill -f "next/dist/compiled"
