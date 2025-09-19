#!/bin/bash

# Alternative auto-commit system using background process
# Since cron is not available in this environment

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_DIR/scripts/auto-commit.sh"
PID_FILE="$PROJECT_DIR/.auto-commit.pid"
LOG_FILE="$PROJECT_DIR/auto-commit.log"

case "$1" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Auto-commit is already running (PID: $(cat $PID_FILE))"
            exit 1
        fi

        echo "Starting auto-commit service..."
        nohup bash -c "
            while true; do
                $SCRIPT_PATH
                sleep 900  # 15 minutes = 900 seconds
            done
        " >> "$LOG_FILE" 2>&1 &

        echo $! > "$PID_FILE"
        echo "Auto-commit started with PID: $!"
        echo "Logs: $LOG_FILE"
        ;;

    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID"
                echo "Auto-commit stopped (PID: $PID)"
            else
                echo "Auto-commit process not running"
            fi
            rm -f "$PID_FILE"
        else
            echo "Auto-commit is not running"
        fi
        ;;

    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Auto-commit is running (PID: $(cat $PID_FILE))"
            echo "Last 5 log entries:"
            tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs yet"
        else
            echo "Auto-commit is not running"
        fi
        ;;

    *)
        echo "Usage: $0 {start|stop|status}"
        echo ""
        echo "Commands:"
        echo "  start  - Start the auto-commit service"
        echo "  stop   - Stop the auto-commit service"
        echo "  status - Check if auto-commit is running"
        exit 1
        ;;
esac