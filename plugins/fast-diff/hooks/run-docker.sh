#!/bin/bash
docker run --rm \
  -v "$(pwd)":/repo \
  -w /repo \
  ghcr.io/brainbrewlabs/fast-diff:latest
