#!/bin/bash

# Landscape Sync Script
# Purpose: Intelligently sync local dev environment with remote
# Usage: ./scripts/sync.sh
#
# Handles:
#   - Pull when remote is ahead
#   - Push when local is ahead
#   - Stash/reapply for uncommitted changes
#   - Dependency updates after pull
#   - Migration detection
#
# Author: Generated with Claude Code
# Date: 2026-01-10

set -e  # Exit on error

# =============================================================================
# COLOR DEFINITIONS
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_color() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

print_success() {
    print_color "$GREEN" "$1"
}

print_warning() {
    print_color "$YELLOW" "$1"
}

print_error() {
    print_color "$RED" "$1"
}

print_info() {
    print_color "$BLUE" "$1"
}

print_header() {
    echo ""
    print_color "$CYAN$BOLD" "========================================"
    print_color "$CYAN$BOLD" "$1"
    print_color "$CYAN$BOLD" "========================================"
}

prompt_yes_no() {
    local prompt="$1"
    local response
    while true; do
        print_info "$prompt (y/n): "
        read -r response
        case "$response" in
            [yY]|[yY][eE][sS]) return 0 ;;
            [nN]|[nN][oO]) return 1 ;;
            *) print_warning "Please answer y or n." ;;
        esac
    done
}

prompt_choice() {
    local prompt="$1"
    local max="$2"
    local choice
    while true; do
        print_info "$prompt"
        read -r choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "$max" ]; then
            echo "$choice"
            return 0
        else
            print_warning "Please enter a number between 1 and $max."
        fi
    done
}

# =============================================================================
# GIT HELPER FUNCTIONS
# =============================================================================

check_git_repo() {
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        print_error "Error: Not inside a git repository!"
        print_error "Please run this script from within the Landscape project directory."
        exit 1
    fi
}

check_network() {
    if ! git ls-remote --exit-code origin &>/dev/null; then
        print_error "Error: Cannot connect to remote 'origin'."
        print_error "Please check your network connection and try again."
        exit 1
    fi
}

fetch_remote() {
    print_info "Fetching from origin..."
    if ! git fetch origin 2>/dev/null; then
        print_error "Error: Failed to fetch from origin."
        print_error "Please check your network connection."
        exit 1
    fi
    print_success "Fetch complete."
}

get_current_branch() {
    git rev-parse --abbrev-ref HEAD
}

has_tracking_branch() {
    local branch="$1"
    git rev-parse --abbrev-ref "${branch}@{u}" &>/dev/null
}

get_local_hash() {
    git rev-parse HEAD
}

get_remote_hash() {
    local branch="$1"
    git rev-parse "origin/${branch}" 2>/dev/null || echo ""
}

get_base_hash() {
    local branch="$1"
    git merge-base HEAD "origin/${branch}" 2>/dev/null || echo ""
}

get_short_hash() {
    local hash="$1"
    echo "${hash:0:7}"
}

get_commit_message() {
    local hash="$1"
    git log -1 --format="%s" "$hash" 2>/dev/null || echo "Unknown"
}

count_commits_ahead() {
    local branch="$1"
    git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo "0"
}

count_commits_behind() {
    local branch="$1"
    git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "0"
}

has_uncommitted_changes() {
    ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null
}

has_staged_changes() {
    ! git diff --cached --quiet 2>/dev/null
}

has_unstaged_changes() {
    ! git diff --quiet 2>/dev/null
}

has_untracked_files() {
    [ -n "$(git ls-files --others --exclude-standard)" ]
}

get_modified_files() {
    git diff --name-only HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
}

get_untracked_files() {
    git ls-files --others --exclude-standard
}

get_remote_timestamp() {
    local branch="$1"
    git log -1 --format="%ct" "origin/${branch}" 2>/dev/null || echo "0"
}

time_ago() {
    local seconds="$1"
    local now
    now=$(date +%s)
    local diff=$((now - seconds))

    if [ "$diff" -lt 60 ]; then
        echo "${diff} seconds ago"
    elif [ "$diff" -lt 3600 ]; then
        echo "$((diff / 60)) minutes ago"
    elif [ "$diff" -lt 86400 ]; then
        echo "$((diff / 3600)) hours ago"
    else
        echo "$((diff / 86400)) days ago"
    fi
}

# =============================================================================
# STATE DETECTION
# =============================================================================

get_sync_state() {
    local branch="$1"
    local local_hash remote_hash base_hash

    local_hash=$(get_local_hash)
    remote_hash=$(get_remote_hash "$branch")
    base_hash=$(get_base_hash "$branch")

    if [ -z "$remote_hash" ]; then
        echo "NO_REMOTE"
        return
    fi

    if [ "$local_hash" = "$remote_hash" ]; then
        echo "SYNCED"
    elif [ "$local_hash" = "$base_hash" ]; then
        echo "REMOTE_AHEAD"
    elif [ "$remote_hash" = "$base_hash" ]; then
        echo "LOCAL_AHEAD"
    else
        echo "DIVERGED"
    fi
}

show_uncommitted_summary() {
    echo ""
    if has_staged_changes; then
        print_warning "Staged changes:"
        git diff --cached --name-only | while read -r file; do
            echo "    ${file}"
        done
    fi

    if has_unstaged_changes; then
        print_warning "Modified (unstaged):"
        git diff --name-only | while read -r file; do
            echo "    ${file}"
        done
    fi

    if has_untracked_files; then
        print_warning "Untracked:"
        get_untracked_files | while read -r file; do
            echo "    ${file}"
        done
    fi
    echo ""
}

show_incoming_commits() {
    local branch="$1"
    local count="$2"
    print_info "Commits to pull (${count}):"
    git log --oneline "HEAD..origin/${branch}" | head -10
    if [ "$count" -gt 10 ]; then
        echo "    ... and $((count - 10)) more"
    fi
    echo ""
}

show_outgoing_commits() {
    local branch="$1"
    local count="$2"
    print_info "Commits to push (${count}):"
    git log --oneline "origin/${branch}..HEAD" | head -10
    if [ "$count" -gt 10 ]; then
        echo "    ... and $((count - 10)) more"
    fi
    echo ""
}

# =============================================================================
# SYNC OPERATIONS
# =============================================================================

do_pull() {
    local branch="$1"
    print_info "Pulling from origin/${branch}..."
    if git pull origin "$branch"; then
        print_success "Pull successful!"
        return 0
    else
        print_error "Pull failed. There may be conflicts to resolve."
        return 1
    fi
}

do_pull_rebase() {
    local branch="$1"
    print_info "Pulling with rebase from origin/${branch}..."
    if git pull --rebase origin "$branch"; then
        print_success "Pull with rebase successful!"
        return 0
    else
        print_error "Rebase failed. Please resolve conflicts manually."
        print_warning "Run 'git rebase --abort' to cancel the rebase."
        return 1
    fi
}

do_push() {
    local branch="$1"
    print_info "Pushing to origin/${branch}..."
    if git push origin "$branch"; then
        print_success "Push successful!"
        return 0
    else
        print_error "Push failed."
        return 1
    fi
}

do_stash() {
    local message="$1"
    print_info "Stashing changes: ${message}"
    if git stash push -m "$message"; then
        print_success "Changes stashed."
        return 0
    else
        print_error "Failed to stash changes."
        return 1
    fi
}

do_stash_pop() {
    print_info "Reapplying stashed changes..."
    if git stash pop; then
        print_success "Stash reapplied successfully!"
        return 0
    else
        print_warning "Stash reapply had conflicts. Your stash is preserved."
        print_warning "Run 'git stash list' to see your stashes."
        return 1
    fi
}

do_stash_pull_reapply() {
    local branch="$1"
    local stash_message="sync-script-auto-stash-$(date +%Y%m%d-%H%M%S)"

    if ! do_stash "$stash_message"; then
        return 1
    fi

    if ! do_pull "$branch"; then
        print_warning "Pull failed. Reapplying your stash..."
        do_stash_pop
        return 1
    fi

    do_stash_pop
    return $?
}

# =============================================================================
# POST-SYNC CHECKS
# =============================================================================

check_dependency_changes() {
    local node_changed=false
    local python_changed=false

    # Check if package.json or package-lock.json changed
    if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -qE '^package(-lock)?\.json$'; then
        node_changed=true
    fi

    # Check if Python dependency files changed
    if git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -qE '(requirements\.txt|pyproject\.toml|Pipfile)$'; then
        python_changed=true
    fi

    if [ "$node_changed" = true ]; then
        echo ""
        print_warning "Node dependencies changed in pulled commits."
        if prompt_yes_no "Run 'npm install'?"; then
            print_info "Running npm install..."
            if npm install; then
                print_success "npm install complete!"
            else
                print_error "npm install failed. Please run manually."
            fi
        fi
    fi

    if [ "$python_changed" = true ]; then
        echo ""
        print_warning "Python dependencies changed in pulled commits."
        if [ -f "requirements.txt" ]; then
            if prompt_yes_no "Run 'pip install -r requirements.txt'?"; then
                print_info "Running pip install..."
                if pip install -r requirements.txt 2>/dev/null || pip install -r requirements.txt --break-system-packages 2>/dev/null; then
                    print_success "pip install complete!"
                else
                    print_error "pip install failed. Please run manually."
                fi
            fi
        fi
    fi
}

check_migration_files() {
    local migrations
    migrations=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -E '(migrations/.*\.(py|sql)$|\.sql$)' || true)

    if [ -n "$migrations" ]; then
        echo ""
        print_warning "Database migrations detected in pulled changes:"
        echo "$migrations" | while read -r file; do
            echo "    ${file}"
        done
        echo ""
        print_warning "Review these before running migrations."
    fi
}

check_docs_changes() {
    local docs_count readme_count
    docs_count=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -cE '^docs/' || echo "0")
    readme_count=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null | grep -ciE 'readme' || echo "0")

    if [ "$docs_count" -gt 0 ] || [ "$readme_count" -gt 0 ]; then
        echo ""
        print_info "Documentation updated:"
        [ "$docs_count" -gt 0 ] && echo "    ${docs_count} files in docs/"
        [ "$readme_count" -gt 0 ] && echo "    ${readme_count} README files"
    fi
}

# =============================================================================
# STATE HANDLERS
# =============================================================================

handle_synced() {
    local branch="$1"
    local local_hash
    local_hash=$(get_local_hash)

    print_success "Already up to date with origin/${branch}"
    echo "  Local: $(get_short_hash "$local_hash") $(get_commit_message "$local_hash")"
    echo ""
    print_success "[No action needed]"
}

handle_remote_ahead_clean() {
    local branch="$1"
    local behind_count
    behind_count=$(count_commits_behind "$branch")

    echo ""
    print_warning "Remote is ${behind_count} commits ahead of local."
    echo ""
    show_incoming_commits "$branch" "$behind_count"

    if prompt_yes_no "Pull now?"; then
        if do_pull "$branch"; then
            check_dependency_changes
            check_migration_files
            check_docs_changes
        fi
    else
        print_info "Pull cancelled."
    fi
}

handle_remote_ahead_dirty() {
    local branch="$1"
    local behind_count
    behind_count=$(count_commits_behind "$branch")

    echo ""
    print_warning "Remote is ${behind_count} commits ahead, but you have uncommitted local changes:"
    show_uncommitted_summary

    echo "Options:"
    echo "  1. Stash changes -> Pull -> Reapply stash"
    echo "  2. Commit changes first, then pull"
    echo "  3. View diff of local changes"
    echo "  4. Cancel"
    echo ""

    local choice
    choice=$(prompt_choice "Choose (1/2/3/4): " 4)

    case "$choice" in
        1)
            if do_stash_pull_reapply "$branch"; then
                check_dependency_changes
                check_migration_files
                check_docs_changes
            fi
            ;;
        2)
            print_info "Please commit your changes and run sync again."
            print_info "Suggested commands:"
            echo "    git add -A"
            echo "    git commit -m 'Your commit message'"
            echo "    ./scripts/sync.sh"
            ;;
        3)
            echo ""
            print_info "Local changes diff:"
            echo "----------------------------------------"
            git diff HEAD
            echo "----------------------------------------"
            echo ""
            print_info "Run sync again when ready."
            ;;
        4)
            print_info "Sync cancelled."
            ;;
    esac
}

handle_local_ahead_clean() {
    local branch="$1"
    local ahead_count remote_timestamp now staleness_hours
    ahead_count=$(count_commits_ahead "$branch")
    remote_timestamp=$(get_remote_timestamp "$branch")
    now=$(date +%s)
    staleness_hours=$(( (now - remote_timestamp) / 3600 ))

    echo ""
    print_info "Local is ${ahead_count} commits ahead of remote."
    echo ""
    show_outgoing_commits "$branch" "$ahead_count"

    # Staleness warning
    if [ "$staleness_hours" -gt 24 ]; then
        print_warning "Note: Remote was last updated $(time_ago "$remote_timestamp")."
        print_warning "      Did you forget to push from another machine?"
        echo ""
    fi

    if prompt_yes_no "Push to origin/${branch}?"; then
        do_push "$branch"
    else
        print_info "Push cancelled."
    fi
}

handle_local_ahead_dirty() {
    local branch="$1"
    local ahead_count
    ahead_count=$(count_commits_ahead "$branch")

    echo ""
    print_info "Local is ${ahead_count} commits ahead of remote."
    print_warning "You also have uncommitted changes."
    show_uncommitted_summary

    echo "Options:"
    echo "  1. Push existing commits only (leave uncommitted changes)"
    echo "  2. Commit all changes first, then push"
    echo "  3. View unpushed commits"
    echo "  4. Cancel"
    echo ""

    local choice
    choice=$(prompt_choice "Choose (1/2/3/4): " 4)

    case "$choice" in
        1)
            do_push "$branch"
            ;;
        2)
            print_info "Please commit your changes and run sync again."
            print_info "Suggested commands:"
            echo "    git add -A"
            echo "    git commit -m 'Your commit message'"
            echo "    ./scripts/sync.sh"
            ;;
        3)
            echo ""
            print_info "Unpushed commits:"
            echo "----------------------------------------"
            git log --oneline "origin/${branch}..HEAD"
            echo "----------------------------------------"
            echo ""
            print_info "Run sync again when ready."
            ;;
        4)
            print_info "Sync cancelled."
            ;;
    esac
}

handle_diverged() {
    local branch="$1"
    local ahead_count behind_count
    ahead_count=$(count_commits_ahead "$branch")
    behind_count=$(count_commits_behind "$branch")

    echo ""
    print_error "Branches have diverged!"
    echo ""

    print_warning "Local has ${ahead_count} commits not on remote:"
    git log --oneline "origin/${branch}..HEAD" | head -5
    [ "$ahead_count" -gt 5 ] && echo "    ... and $((ahead_count - 5)) more"
    echo ""

    print_warning "Remote has ${behind_count} commits not in local:"
    git log --oneline "HEAD..origin/${branch}" | head -5
    [ "$behind_count" -gt 5 ] && echo "    ... and $((behind_count - 5)) more"
    echo ""

    if has_uncommitted_changes; then
        print_error "You also have uncommitted changes. Please commit or stash them first."
        show_uncommitted_summary
        print_info "Run sync again after handling uncommitted changes."
        return
    fi

    echo "Options:"
    echo "  1. Pull with rebase (recommended)"
    echo "  2. Pull with merge"
    echo "  3. View detailed diff"
    echo "  4. Cancel (resolve manually)"
    echo ""

    local choice
    choice=$(prompt_choice "Choose (1/2/3/4): " 4)

    case "$choice" in
        1)
            if do_pull_rebase "$branch"; then
                print_info "Your local commits are now on top of remote changes."
                print_info "Don't forget to push when ready."
                check_dependency_changes
                check_migration_files
                check_docs_changes
            fi
            ;;
        2)
            if do_pull "$branch"; then
                print_info "Merge complete. Don't forget to push when ready."
                check_dependency_changes
                check_migration_files
                check_docs_changes
            fi
            ;;
        3)
            echo ""
            print_info "Commits on local not on remote:"
            echo "----------------------------------------"
            git log --oneline "origin/${branch}..HEAD"
            echo "----------------------------------------"
            echo ""
            print_info "Commits on remote not in local:"
            echo "----------------------------------------"
            git log --oneline "HEAD..origin/${branch}"
            echo "----------------------------------------"
            echo ""
            print_info "Run sync again when ready."
            ;;
        4)
            print_info "Sync cancelled."
            print_info "Suggested manual resolution:"
            echo "    git pull --rebase origin ${branch}"
            echo "    # Resolve any conflicts"
            echo "    git push origin ${branch}"
            ;;
    esac
}

handle_no_tracking_branch() {
    local branch="$1"

    print_warning "No remote tracking branch for '${branch}'."
    echo ""

    if prompt_yes_no "Set up tracking and push to origin/${branch}?"; then
        print_info "Pushing and setting upstream..."
        if git push -u origin "$branch"; then
            print_success "Branch '${branch}' now tracks origin/${branch}"
        else
            print_error "Failed to set up tracking branch."
        fi
    else
        print_info "You can set up tracking manually with:"
        echo "    git push -u origin ${branch}"
    fi
}

# =============================================================================
# SUMMARY OUTPUT
# =============================================================================

show_summary() {
    local branch="$1"
    local status="$2"
    local local_hash remote_hash

    local_hash=$(get_local_hash)
    remote_hash=$(get_remote_hash "$branch")

    print_header "Sync Complete - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Branch: ${branch}"
    echo "Status: ${status}"
    echo "Local:  $(get_short_hash "$local_hash")"
    [ -n "$remote_hash" ] && echo "Remote: $(get_short_hash "$remote_hash")"

    # Show any warnings
    if has_uncommitted_changes; then
        echo ""
        print_warning "Note: You have uncommitted changes."
    fi

    local ahead behind
    ahead=$(count_commits_ahead "$branch")
    behind=$(count_commits_behind "$branch")

    if [ "$ahead" -gt 0 ]; then
        echo ""
        print_warning "Note: ${ahead} unpushed commits."
    fi

    if [ "$behind" -gt 0 ]; then
        echo ""
        print_warning "Note: ${behind} commits to pull."
    fi

    print_color "$CYAN" "========================================"
}

# =============================================================================
# MAIN FUNCTION
# =============================================================================

main() {
    local branch state has_dirty has_untracked final_status

    print_header "Landscape Sync"

    # Pre-flight checks
    check_git_repo

    # Change to repo root
    cd "$(git rev-parse --show-toplevel)"

    branch=$(get_current_branch)
    print_info "Current branch: ${branch}"
    echo ""

    # Check for tracking branch before fetching
    if ! has_tracking_branch "$branch"; then
        handle_no_tracking_branch "$branch"
        exit 0
    fi

    # Fetch and check network
    fetch_remote

    # Get state
    state=$(get_sync_state "$branch")
    has_dirty=$(has_uncommitted_changes && echo "true" || echo "false")
    has_untracked=$(has_untracked_files && echo "true" || echo "false")

    final_status="UNKNOWN"

    # Handle based on state
    case "$state" in
        "SYNCED")
            handle_synced "$branch"
            final_status="SYNCED"
            ;;
        "REMOTE_AHEAD")
            if [ "$has_dirty" = "true" ]; then
                handle_remote_ahead_dirty "$branch"
            else
                handle_remote_ahead_clean "$branch"
            fi
            final_status="PULLED"
            ;;
        "LOCAL_AHEAD")
            if [ "$has_dirty" = "true" ]; then
                handle_local_ahead_dirty "$branch"
            else
                handle_local_ahead_clean "$branch"
            fi
            final_status="PUSHED"
            ;;
        "DIVERGED")
            handle_diverged "$branch"
            final_status="MERGED"
            ;;
        "NO_REMOTE")
            handle_no_tracking_branch "$branch"
            final_status="NEW_BRANCH"
            ;;
        *)
            print_error "Unknown sync state: ${state}"
            exit 1
            ;;
    esac

    echo ""
    show_summary "$branch" "$final_status"
}

# Run main function
main "$@"
