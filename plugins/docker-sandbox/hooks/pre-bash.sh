#!/bin/bash
INPUT=$(cat /dev/stdin)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

[ -z "$COMMAND" ] && exit 0

IMAGE="${DOCKER_SANDBOX_IMAGE:-ubuntu:22.04}"

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  --network "${DOCKER_SANDBOX_NETWORK:-none}" \
  "$IMAGE" \
  bash -c "$COMMAND"

exit 2
