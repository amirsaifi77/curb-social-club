#!/usr/bin/env bash
# Render build for the API (render.yaml). Both the web service and the
# worker run it; only the web service compiles assets and migrates, so
# migrations run once per deploy. db:migrate rather than db:prepare: on the
# empty database Render creates, db:prepare would load structure.sql through
# the psql binary, which the native Ruby build image is not guaranteed to
# have. db:seed only creates the app account and is idempotent.
set -o errexit

bundle install

if [ "${RENDER_SERVICE_TYPE:-web}" = "web" ]; then
  bin/rails assets:precompile
  bin/rails assets:clean
  bin/rails db:migrate
  bin/rails db:seed
fi
