#!/bin/bash

# Setup script to enable auto-commit on development session start
# This script configures shell profiles and development environment

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Setting up auto-commit auto-start for landscape project..."

# Function to add auto-start to shell profile
add_to_shell_profile() {
    local profile_file="$1"
    local profile_name="$2"

    if [ -f "$profile_file" ]; then
        # Check if auto-start is already configured
        if grep -q "landscape auto-commit" "$profile_file"; then
            echo "Auto-start already configured in $profile_name"
            return
        fi

        echo "" >> "$profile_file"
        echo "# Auto-start landscape auto-commit when in project directory" >> "$profile_file"
        echo "if [[ \"\$PWD\" == \"$PROJECT_DIR\"* ]] && [[ -f \"$PROJECT_DIR/scripts/start-auto-commit.sh\" ]]; then" >> "$profile_file"
        echo "    if ! \"\$PROJECT_DIR/scripts/start-auto-commit.sh\" status >/dev/null 2>&1; then" >> "$profile_file"
        echo "        echo \"🚀 Starting auto-commit for landscape project...\"" >> "$profile_file"
        echo "        \"\$PROJECT_DIR/scripts/start-auto-commit.sh\" start" >> "$profile_file"
        echo "    fi" >> "$profile_file"
        echo "fi" >> "$profile_file"

        echo "✅ Added auto-start to $profile_name"
    fi
}

# Add to common shell profiles
add_to_shell_profile "$HOME/.bashrc" ".bashrc"
add_to_shell_profile "$HOME/.zshrc" ".zshrc"
add_to_shell_profile "$HOME/.profile" ".profile"

# Create a project-specific .envrc file for direnv users
cat > "$PROJECT_DIR/.envrc" << 'EOF'
#!/bin/bash
# Auto-start auto-commit when entering project directory

PROJECT_ROOT="$(pwd)"

if [[ -f "$PROJECT_ROOT/scripts/start-auto-commit.sh" ]]; then
    if ! "$PROJECT_ROOT/scripts/start-auto-commit.sh" status >/dev/null 2>&1; then
        echo "🚀 Starting auto-commit for landscape project..."
        "$PROJECT_ROOT/scripts/start-auto-commit.sh" start
    fi
fi
EOF

echo "✅ Created .envrc for direnv users"

echo ""
echo "Setup complete! Auto-commit will now start automatically when you:"
echo "  • Open a new terminal in the project directory"
echo "  • Enter the project directory (if using direnv)"
echo ""
echo "Manual commands:"
echo "  npm run auto-commit:start  - Start auto-commit"
echo "  npm run auto-commit:stop   - Stop auto-commit"
echo "  npm run auto-commit:status - Check status"
echo ""
echo "To apply changes to current session, run:"
echo "  source ~/.bashrc  # or ~/.zshrc depending on your shell"