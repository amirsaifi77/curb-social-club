#!/usr/bin/env bash
# Render build for the API (render.yaml). Both the web service and the
# worker run it; only the web service compiles assets and prepares the
# database, so migrations run once per deploy.
set -o errexit

bundle install

if [ "${RENDER_SERVICE_TYPE:-web}" = "web" ]; then
  bin/rails assets:precompile
  bin/rails assets:clean
  bin/rails db:prepare
fi
