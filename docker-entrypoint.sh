#!/bin/bash

echo "Launching OTWOL..."

#Launch Cron
cron

# Launch application
cd /app
GUNICORN_CMD_ARGS="--bind=$BIND_ADDRESS:$PORT" gunicorn --access-logfile - wol:app
